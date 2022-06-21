//@ts-ignore
import sha256 from "crypto-js/sha256";
import { AbiItem } from "web3-utils/types";
//@ts-ignore
import * as MockERC20 from "@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockERC20Decimals.sol/MockERC20Decimals.json";
import {
  approve,
  Aquarius,
  Config,
  Erc20CreateParams,
  getHash,
  Nft,
  NftCreateData,
  NftFactory,
  Pool,
  PoolCreationParams,
  ProviderInstance,
  ZERO_ADDRESS,
} from "@oceanprotocol/lib";
import { web3, getTestConfig, getAddresses } from "./config";

let config: Config;
let aquarius: Aquarius;
let providerUrl: any;
let publisherAccount: string;
let consumerAccount: string;
let stakerAccount: string;
let addresses: any;
let poolNftAddress: string;
let poolDatatokenAddress: string;
let poolAddress: string;

const POOL_NFT_NAME = "Datatoken 1";
const POOL_NFT_SYMBOL = "DT1";

//to build: npx tscp -w
///test: https://raw.githubusercontent.com/oceanprotocol/testdatasets/main/shs_dataset_test.txt
async function init(fileUrl: string, useLocal: boolean) {
  if (!fileUrl || fileUrl.length <= 0) {
    console.error(
      "Invalid File URL! Set arguments like this: node index.js fileUrl=<url>"
    );
    return;
  }

  const ASSET_URL = [
    {
      type: "url",
      url: fileUrl,
      method: "GET",
    },
  ];

  const DDO = {
    "@context": ["https://w3id.org/did/v1"],
    id: "",
    version: "4.0.0",
    chainId: 4,
    nftAddress: "0x0",
    metadata: {
      created: "2021-12-20T14:35:20Z",
      updated: "2021-12-20T14:35:20Z",
      type: "dataset",
      name: "dataset-name",
      description: "Ocean protocol test dataset description",
      author: "oceanprotocol-team",
      license: "MIT",
    },
    services: [
      {
        id: "testFakeId",
        type: "access",
        files: "",
        datatokenAddress: "0x0",
        serviceEndpoint: "https://providerv4.rinkeby.oceanprotocol.com",
        timeout: 0,
      },
    ],
  };

  console.log("initializing");
  config = await getTestConfig(web3);
  aquarius = new Aquarius(config.metadataCacheUri as any);
  providerUrl = useLocal ? "http://localhost:8030/" : config.providerUri;

  console.log(`Aquarius URL: ${config.metadataCacheUri}`);
  console.log(`Provider URL: ${providerUrl}`);

  const accounts = await web3.eth.getAccounts();
  publisherAccount = accounts[0];
  consumerAccount = accounts[1];
  stakerAccount = accounts[2];

  console.log(`Publisher account address: ${publisherAccount}`);
  console.log(`Consumer account address: ${consumerAccount}`);
  console.log(`Staker account address: ${stakerAccount}`);

  addresses = getAddresses();

  const oceanContract = new web3.eth.Contract(
    MockERC20.abi as AbiItem[],
    addresses.Ocean
  );

  await oceanContract.methods
    .transfer(consumerAccount, web3.utils.toWei("100"))
    .send({ from: publisherAccount });

  await oceanContract.methods
    .transfer(stakerAccount, web3.utils.toWei("100"))
    .send({ from: publisherAccount });

  const factory = new NftFactory(addresses.ERC721Factory, web3);

  const nftParams: NftCreateData = {
    name: POOL_NFT_NAME,
    symbol: POOL_NFT_SYMBOL,
    templateIndex: 1,
    tokenURI: "",
    transferable: true,
    owner: publisherAccount,
  };

  const erc20Params: Erc20CreateParams = {
    templateIndex: 1,
    cap: "100000",
    feeAmount: "0",
    paymentCollector: ZERO_ADDRESS,
    feeToken: ZERO_ADDRESS,
    minter: publisherAccount,
    mpFeeAddress: ZERO_ADDRESS,
  };

  const poolParams: PoolCreationParams = {
    ssContract: addresses.Staking,
    baseTokenAddress: addresses.Ocean,
    baseTokenSender: addresses.ERC721Factory,
    publisherAddress: publisherAccount,
    marketFeeCollector: publisherAccount,
    poolTemplateAddress: addresses.poolTemplate,
    rate: "1",
    baseTokenDecimals: 18,
    vestingAmount: "10000",
    vestedBlocks: 2500000,
    initialBaseTokenLiquidity: "2000",
    swapFeeLiquidityProvider: "0.001",
    swapFeeMarketRunner: "0.001",
  };

  await approve(
    web3,
    publisherAccount,
    addresses.Ocean,
    addresses.ERC721Factory,
    poolParams.vestingAmount
  );

  const tx = await factory.createNftErc20WithPool(
    publisherAccount,
    nftParams,
    erc20Params,
    poolParams
  );

  poolNftAddress = (tx as any).events.NFTCreated.returnValues[0];
  poolDatatokenAddress = (tx as any).events.TokenCreated.returnValues[0];
  poolAddress = (tx as any).events.NewPool.returnValues[0];

  console.log(`Pool NFT address: ${poolNftAddress}`);
  console.log(`Pool Datatoken address: ${poolDatatokenAddress}`);
  console.log(`Pool address: ${poolAddress}`);

  console.log("creating nft");
  const nft = new Nft(web3);
  DDO.chainId = await web3.eth.getChainId();
  const checksum = sha256(
    web3.utils.toChecksumAddress(poolNftAddress) + DDO.chainId.toString(10)
  );
  DDO.id = "did:op:" + checksum;
  DDO.nftAddress = poolNftAddress;

  const encryptedFiles = await ProviderInstance.encrypt(
    ASSET_URL,
    providerUrl as any
  );
  console.log("encrypted files:", encryptedFiles);
  DDO.services[0].files = encryptedFiles;
  console.log("files");
  DDO.services[0].datatokenAddress = poolDatatokenAddress;

  console.log(`DID: ${DDO.id}`);

  const providerResponse = await ProviderInstance.encrypt(
    DDO,
    providerUrl as any
  );
  const encryptedDDO = providerResponse;
  const metadataHash = getHash(JSON.stringify(DDO));
  await nft.setMetadata(
    poolNftAddress,
    publisherAccount,
    0,
    providerUrl as any,
    "",
    "0x2",
    encryptedDDO,
    "0x" + metadataHash
  );

  const pool = new Pool(web3);
  await approve(web3, stakerAccount, addresses.Ocean, poolAddress, "5", true);
  await pool.joinswapExternAmountIn(stakerAccount, poolAddress, "5", "0.1");

  const prices = await pool.getAmountInExactOut(
    poolAddress,
    poolDatatokenAddress,
    addresses.Ocean,
    "1",
    "0.01"
  );

  console.log(`Price of 1 ${POOL_NFT_SYMBOL} is ${prices.tokenAmount} OCEAN`);
}

let url = "";
let useLocal: boolean = false;
let error: boolean = false;
try {
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i].startsWith("fileUrl=")) {
      url = process.argv[i].split("=")[1];
    }
    if (process.argv[i].startsWith("useLocal=")) {
      useLocal = process.argv[i].split("=")[1] === "true";
    }
  }
} catch (e) {
  console.error(
    "Invalid File URL! Set arguments like this: node index.js fileUrl=<url>"
  );
  error = true;
}

if (error === false) {
  init(url, useLocal);
}
