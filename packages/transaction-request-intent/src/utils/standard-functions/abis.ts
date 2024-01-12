import { AbiParameter, } from 'viem';

export const Erc20TransferAbiParameters: AbiParameter[] = [
  { type: 'address', name: 'recipient' },
  { type: 'uint256', name: 'amount' },
];

export const Erc20TransferFromAbiParameters: AbiParameter[] = [
  { type: 'address', name: 'sender' },
  { type: 'address', name: 'recipient' },
  { type: 'uint256', name: 'amount' },
];

export const Erc20TransferAbi = {
  '0xa9059cbb': Erc20TransferAbiParameters,
  '0x23b872dd': Erc20TransferFromAbiParameters,
}

export const Erc721TransferFromAbiParameters: AbiParameter[] = [
  { type: 'address', name: 'from' },
  { type: 'address', name: 'to' },
  { type: 'uint256', name: 'tokenId' },
];

export const Erc721SafeTransferFromAbiParameters: AbiParameter[] = [
  { type: 'address', name: 'from' },
  { type: 'address', name: 'to' },
  { type: 'uint256', name: 'tokenId' },
  { type: 'bytes', name: 'data' },
];

export const Erc721TransferAbi = {
  '0x23b872dd': Erc721TransferFromAbiParameters,
  '0x42842e0e': Erc721TransferFromAbiParameters,
  '0xb88d4fde': Erc721SafeTransferFromAbiParameters,
};

// export const Erc1155TransferSignatures: {[key: string]: AbiParameter} = {
//   "0xa22cb465": {
//       "constant": false,
//       "inputs": [
//           {
//               "name": "from",
//               "type": "address"
//           },
//           {
//               "name": "to",
//               "type": "address"
//           },
//           {
//               "name": "id",
//               "type": "uint256"
//           },
//           {
//               "name": "amount",
//               "type": "uint256"
//           },
//           {
//               "name": "data",
//               "type": "bytes"
//           }
//       ],
//       "name": "safeTransferFrom",
//       "outputs": [],
//       "payable": false,
//       "stateMutability": "nonpayable",
//       "type": "function"
//   },
//   "0xf242432a": {
//       "constant": false,
//       "inputs": [
//           {
//               "name": "from",
//               "type": "address"
//           },
//           {
//               "name": "to",
//               "type": "address"
//           },
//           {
//               "name": "ids",
//               "type": "uint256[]"
//           },
//           {
//               "name": "amounts",
//               "type": "uint256[]"
//           },
//           {
//               "name": "data",
//               "type": "bytes"
//           }
//       ],
//       "name": "safeBatchTransferFrom",
//       "outputs": [],
//       "payable": false,
//       "stateMutability": "nonpayable",
//       "type": "function"
//   }
// };
