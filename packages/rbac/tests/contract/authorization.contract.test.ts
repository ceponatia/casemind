import {
  evaluateFieldAccess,
  evaluatePermission,
} from "../../src/index.js";
import { runAuthorizationPolicyContractSuite } from "../../src/testing/authorization-contract.js";

runAuthorizationPolicyContractSuite("rbac authorization policy contract", () => ({
  evaluatePermission,
  evaluateFieldAccess,
}));