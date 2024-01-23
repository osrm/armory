package main

import future.keywords.in

permit[{"policyId": "test-policy-3"}] := reason {
	checkPrincipal
	input.action == "signTransaction"
	checkTransferTokenType({"transferERC20"})
	checkTransferTokenAddress({"eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174"})
	checkTransferTokenOperation({"operator": "lte", "value": "1000000000000000000"})
	approvalsRequired = [{
		"approvalCount": 2,
		"countPrincipal": false,
		"approvalEntityType": "Narval::UserRole",
		"entityIds": ["root", "admin"],
	}]
	approvals := getApprovalsResult(approvalsRequired)
	reason := {
		"type": "permit",
		"policyId": "test-policy-3",
		"approvalsSatisfied": approvals.approvalsSatisfied,
		"approvalsMissing": approvals.approvalsMissing,
	}
}