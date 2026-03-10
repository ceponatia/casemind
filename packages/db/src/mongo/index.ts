import { randomUUID } from "node:crypto";

import {
  Db,
  type Document,
  MongoClient,
  type Collection,
  type IndexDescription,
} from "mongodb";

import type {
  CatalogRepository,
  CaseRepository,
  PersonRepository,
  RepositoryContext,
} from "../contracts.js";
import type {
  CaseStatusCount,
  CriminalCase,
  DocumentRecord,
  EvidenceRecord,
  FamilyUnit,
  NACase,
  NewCriminalCase,
  NewDocumentRecord,
  NewEvidenceRecord,
  NewFamilyUnit,
  NewNACase,
  NewPerson,
  NewServicePlan,
  Person,
  ServicePlan,
  TenantScopedRecord,
} from "../types.js";

const COLLECTIONS = {
  criminalCases: "cases",
  naCases: "na_cases",
  people: "persons",
  documents: "documents",
  evidence: "evidence",
  familyUnits: "family_units",
  servicePlans: "service_plans",
} as const;

function nowIso(): string {
  return new Date().toISOString();
}

function resolveDatabaseName(connectionString: string): string {
  const url = new URL(connectionString);
  return url.pathname.replace(/^\//, "") || "casemind";
}

function requireContext(context: RepositoryContext): void {
  if (context.tenantId.length === 0 || context.actorUserId.length === 0) {
    throw new Error("Repository context requires tenantId and actorUserId.");
  }
}

function collectionFor<T extends Document>(
  database: Db,
  name: string,
): Collection<T> {
  return database.collection<T>(name);
}

function createTenantRecord<
  TInput extends { id?: string },
  TRecord extends TenantScopedRecord,
>(
  context: RepositoryContext,
  input: TInput,
  mapper: (base: TenantScopedRecord, input: TInput) => TRecord,
): TRecord {
  requireContext(context);
  const timestamp = nowIso();
  return mapper(
    {
      id: input.id ?? randomUUID(),
      tenantId: context.tenantId,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    input,
  );
}

function ensureDocument<T>(document: T | null, message: string): T {
  if (document === null) {
    throw new Error(message);
  }

  return document;
}

export interface MongoDatabaseConnection {
  client: MongoClient;
  database: Db;
}

export async function connectMongoDatabase(
  connectionString: string,
): Promise<MongoDatabaseConnection> {
  const client = new MongoClient(connectionString);
  await client.connect();

  return {
    client,
    database: client.db(resolveDatabaseName(connectionString)),
  };
}

export async function resetMongoDatabase(database: Db): Promise<void> {
  await database.dropDatabase();
}

export async function applyMongoIndexes(database: Db): Promise<void> {
  const indexDefinitions: Array<[string, IndexDescription[]]> = [
    [
      COLLECTIONS.criminalCases,
      [
        { key: { tenantId: 1, id: 1 }, unique: true, name: "tenant_id_unique" },
        {
          key: { tenantId: 1, caseNumber: 1 },
          unique: true,
          name: "tenant_case_number_unique",
        },
        { key: { tenantId: 1, status: 1 }, name: "tenant_status_idx" },
      ],
    ],
    [
      COLLECTIONS.naCases,
      [
        { key: { tenantId: 1, id: 1 }, unique: true, name: "tenant_id_unique" },
        {
          key: { tenantId: 1, petitionNumber: 1 },
          unique: true,
          name: "tenant_petition_number_unique",
        },
      ],
    ],
    [
      COLLECTIONS.people,
      [
        { key: { tenantId: 1, id: 1 }, unique: true, name: "tenant_id_unique" },
        {
          key: { tenantId: 1, lastName: 1, firstName: 1 },
          name: "tenant_name_idx",
        },
      ],
    ],
    [
      COLLECTIONS.documents,
      [
        { key: { tenantId: 1, id: 1 }, unique: true, name: "tenant_id_unique" },
        { key: { tenantId: 1, caseId: 1 }, name: "tenant_case_idx" },
      ],
    ],
    [
      COLLECTIONS.evidence,
      [
        { key: { tenantId: 1, id: 1 }, unique: true, name: "tenant_id_unique" },
        {
          key: { tenantId: 1, evidenceNumber: 1 },
          unique: true,
          name: "tenant_evidence_number_unique",
        },
        { key: { tenantId: 1, caseId: 1 }, name: "tenant_case_idx" },
      ],
    ],
    [
      COLLECTIONS.familyUnits,
      [
        { key: { tenantId: 1, id: 1 }, unique: true, name: "tenant_id_unique" },
        { key: { tenantId: 1, caseId: 1 }, name: "tenant_case_idx" },
      ],
    ],
    [
      COLLECTIONS.servicePlans,
      [
        { key: { tenantId: 1, id: 1 }, unique: true, name: "tenant_id_unique" },
        { key: { tenantId: 1, caseId: 1 }, name: "tenant_case_idx" },
      ],
    ],
  ];

  for (const [collectionName, indexes] of indexDefinitions) {
    const collection = database.collection(collectionName);

    for (const index of indexes) {
      await collection.createIndex(index.key, index);
    }
  }
}

export class MongoCaseRepository implements CaseRepository {
  private readonly criminalCases: Collection<CriminalCase>;
  private readonly naCases: Collection<NACase>;

  public constructor(database: Db) {
    this.criminalCases = collectionFor<CriminalCase>(
      database,
      COLLECTIONS.criminalCases,
    );
    this.naCases = collectionFor<NACase>(database, COLLECTIONS.naCases);
  }

  public async createCriminalCase(
    context: RepositoryContext,
    input: NewCriminalCase,
  ): Promise<CriminalCase> {
    const criminalCase = createTenantRecord(context, input, (base, value) => ({
      ...base,
      caseNumber: value.caseNumber,
      status: value.status,
      court: value.court,
      ...(value.filedAt === undefined ? {} : { filedAt: value.filedAt }),
      defendantPersonIds: [...value.defendantPersonIds],
      victimPersonIds: [...value.victimPersonIds],
      chargeIds: [...value.chargeIds],
    }));
    await this.criminalCases.insertOne(criminalCase);
    return criminalCase;
  }

  public async getCriminalCaseById(
    context: RepositoryContext,
    caseId: string,
  ): Promise<CriminalCase | null> {
    requireContext(context);
    return this.criminalCases.findOne({
      tenantId: context.tenantId,
      id: caseId,
    });
  }

  public async updateCriminalCase(
    context: RepositoryContext,
    caseId: string,
    patch: Partial<NewCriminalCase>,
  ): Promise<CriminalCase> {
    requireContext(context);
    const result = await this.criminalCases.findOneAndUpdate(
      { tenantId: context.tenantId, id: caseId },
      { $set: { ...patch, updatedAt: nowIso() } },
      { returnDocument: "after" },
    );

    return ensureDocument(result, `Criminal case not found: ${caseId}`);
  }

  public async listCriminalCases(
    context: RepositoryContext,
  ): Promise<CriminalCase[]> {
    requireContext(context);
    return this.criminalCases
      .find({ tenantId: context.tenantId })
      .sort({ caseNumber: 1 })
      .toArray();
  }

  public async summarizeCriminalCaseStatuses(
    context: RepositoryContext,
  ): Promise<CaseStatusCount[]> {
    requireContext(context);
    const rows = await this.criminalCases
      .aggregate<{
        _id: string;
        count: number;
      }>([
        { $match: { tenantId: context.tenantId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    return rows.map((row) => ({ status: row._id, count: row.count }));
  }

  public async createNACase(
    context: RepositoryContext,
    input: NewNACase,
  ): Promise<NACase> {
    const naCase = createTenantRecord(context, input, (base, value) => ({
      ...base,
      petitionNumber: value.petitionNumber,
      status: value.status,
      childPersonIds: [...value.childPersonIds],
      respondentPersonIds: [...value.respondentPersonIds],
      ...(value.familyUnitId === undefined
        ? {}
        : { familyUnitId: value.familyUnitId }),
      servicePlanIds: [...value.servicePlanIds],
    }));
    await this.naCases.insertOne(naCase);
    return naCase;
  }

  public async getNACaseById(
    context: RepositoryContext,
    caseId: string,
  ): Promise<NACase | null> {
    requireContext(context);
    return this.naCases.findOne({ tenantId: context.tenantId, id: caseId });
  }

  public async updateNACase(
    context: RepositoryContext,
    caseId: string,
    patch: Partial<NewNACase>,
  ): Promise<NACase> {
    requireContext(context);
    const result = await this.naCases.findOneAndUpdate(
      { tenantId: context.tenantId, id: caseId },
      { $set: { ...patch, updatedAt: nowIso() } },
      { returnDocument: "after" },
    );

    return ensureDocument(result, `NA case not found: ${caseId}`);
  }

  public async listNACases(context: RepositoryContext): Promise<NACase[]> {
    requireContext(context);
    return this.naCases
      .find({ tenantId: context.tenantId })
      .sort({ petitionNumber: 1 })
      .toArray();
  }
}

export class MongoPersonRepository implements PersonRepository {
  private readonly people: Collection<Person>;

  public constructor(database: Db) {
    this.people = collectionFor<Person>(database, COLLECTIONS.people);
  }

  public async createPerson(
    context: RepositoryContext,
    input: NewPerson,
  ): Promise<Person> {
    const person = createTenantRecord(context, input, (base, value) => ({
      ...base,
      firstName: value.firstName,
      lastName: value.lastName,
      ...(value.dateOfBirth === undefined
        ? {}
        : { dateOfBirth: value.dateOfBirth }),
      roleTags: [...value.roleTags],
      externalIdentifiers: [...value.externalIdentifiers],
    }));
    await this.people.insertOne(person);
    return person;
  }

  public async getPersonById(
    context: RepositoryContext,
    personId: string,
  ): Promise<Person | null> {
    requireContext(context);
    return this.people.findOne({ tenantId: context.tenantId, id: personId });
  }

  public async listPeopleByIds(
    context: RepositoryContext,
    personIds: string[],
  ): Promise<Person[]> {
    requireContext(context);

    if (personIds.length === 0) {
      return [];
    }

    return this.people
      .find({ tenantId: context.tenantId, id: { $in: personIds } })
      .sort({ lastName: 1, firstName: 1 })
      .toArray();
  }
}

export class MongoCatalogRepository implements CatalogRepository {
  private readonly documents: Collection<DocumentRecord>;
  private readonly evidence: Collection<EvidenceRecord>;
  private readonly familyUnits: Collection<FamilyUnit>;
  private readonly servicePlans: Collection<ServicePlan>;

  public constructor(database: Db) {
    this.documents = collectionFor<DocumentRecord>(
      database,
      COLLECTIONS.documents,
    );
    this.evidence = collectionFor<EvidenceRecord>(
      database,
      COLLECTIONS.evidence,
    );
    this.familyUnits = collectionFor<FamilyUnit>(
      database,
      COLLECTIONS.familyUnits,
    );
    this.servicePlans = collectionFor<ServicePlan>(
      database,
      COLLECTIONS.servicePlans,
    );
  }

  public async createDocument(
    context: RepositoryContext,
    input: NewDocumentRecord,
  ): Promise<DocumentRecord> {
    const record = createTenantRecord(context, input, (base, value) => ({
      ...base,
      caseId: value.caseId,
      title: value.title,
      documentType: value.documentType,
      storageKey: value.storageKey,
      classification: value.classification,
      ...(value.textContent === undefined
        ? {}
        : { textContent: value.textContent }),
    }));
    await this.documents.insertOne(record);
    return record;
  }

  public async listDocumentsByCase(
    context: RepositoryContext,
    caseId: string,
  ): Promise<DocumentRecord[]> {
    requireContext(context);
    return this.documents
      .find({ tenantId: context.tenantId, caseId })
      .sort({ title: 1 })
      .toArray();
  }

  public async createEvidence(
    context: RepositoryContext,
    input: NewEvidenceRecord,
  ): Promise<EvidenceRecord> {
    const record = createTenantRecord(context, input, (base, value) => ({
      ...base,
      caseId: value.caseId,
      evidenceNumber: value.evidenceNumber,
      documentIds: [...value.documentIds],
      chainOfCustody: [...value.chainOfCustody],
      description: value.description,
    }));
    await this.evidence.insertOne(record);
    return record;
  }

  public async listEvidenceByCase(
    context: RepositoryContext,
    caseId: string,
  ): Promise<EvidenceRecord[]> {
    requireContext(context);
    return this.evidence
      .find({ tenantId: context.tenantId, caseId })
      .sort({ evidenceNumber: 1 })
      .toArray();
  }

  public async createFamilyUnit(
    context: RepositoryContext,
    input: NewFamilyUnit,
  ): Promise<FamilyUnit> {
    const record = createTenantRecord(context, input, (base, value) => ({
      ...base,
      caseId: value.caseId,
      childPersonIds: [...value.childPersonIds],
      adultPersonIds: [...value.adultPersonIds],
      address: value.address,
    }));
    await this.familyUnits.insertOne(record);
    return record;
  }

  public async getFamilyUnitById(
    context: RepositoryContext,
    familyUnitId: string,
  ): Promise<FamilyUnit | null> {
    requireContext(context);
    return this.familyUnits.findOne({
      tenantId: context.tenantId,
      id: familyUnitId,
    });
  }

  public async createServicePlan(
    context: RepositoryContext,
    input: NewServicePlan,
  ): Promise<ServicePlan> {
    const record = createTenantRecord(context, input, (base, value) => ({
      ...base,
      caseId: value.caseId,
      goal: value.goal,
      status: value.status,
      taskIds: [...value.taskIds],
    }));
    await this.servicePlans.insertOne(record);
    return record;
  }

  public async listServicePlansByCase(
    context: RepositoryContext,
    caseId: string,
  ): Promise<ServicePlan[]> {
    requireContext(context);
    return this.servicePlans
      .find({ tenantId: context.tenantId, caseId })
      .sort({ goal: 1 })
      .toArray();
  }
}
