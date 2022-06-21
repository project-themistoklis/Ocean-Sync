"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
//@ts-ignore
const sha256_1 = __importDefault(require("crypto-js/sha256"));
//@ts-ignore
const MockERC20 = __importStar(require("@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockERC20Decimals.sol/MockERC20Decimals.json"));
const lib_1 = require("@oceanprotocol/lib");
const config_1 = require("./config");
let config;
let aquarius;
let providerUrl;
let publisherAccount;
let consumerAccount;
let stakerAccount;
let addresses;
let poolNftAddress;
let poolDatatokenAddress;
let poolAddress;
const POOL_NFT_NAME = "Datatoken 1";
const POOL_NFT_SYMBOL = "DT1";
//to build: npx tscp -w
///test: https://raw.githubusercontent.com/oceanprotocol/testdatasets/main/shs_dataset_test.txt
function init(fileUrl, useLocal) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!fileUrl || fileUrl.length <= 0) {
            console.error("Invalid File URL! Set arguments like this: node index.js fileUrl=<url>");
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
        config = yield (0, config_1.getTestConfig)(config_1.web3);
        aquarius = new lib_1.Aquarius(config.metadataCacheUri);
        providerUrl = useLocal ? "http://localhost:8030/" : config.providerUri;
        console.log(`Aquarius URL: ${config.metadataCacheUri}`);
        console.log(`Provider URL: ${providerUrl}`);
        const accounts = yield config_1.web3.eth.getAccounts();
        publisherAccount = accounts[0];
        consumerAccount = accounts[1];
        stakerAccount = accounts[2];
        console.log(`Publisher account address: ${publisherAccount}`);
        console.log(`Consumer account address: ${consumerAccount}`);
        console.log(`Staker account address: ${stakerAccount}`);
        addresses = (0, config_1.getAddresses)();
        const oceanContract = new config_1.web3.eth.Contract(MockERC20.abi, addresses.Ocean);
        yield oceanContract.methods
            .transfer(consumerAccount, config_1.web3.utils.toWei("100"))
            .send({ from: publisherAccount });
        yield oceanContract.methods
            .transfer(stakerAccount, config_1.web3.utils.toWei("100"))
            .send({ from: publisherAccount });
        const factory = new lib_1.NftFactory(addresses.ERC721Factory, config_1.web3);
        const nftParams = {
            name: POOL_NFT_NAME,
            symbol: POOL_NFT_SYMBOL,
            templateIndex: 1,
            tokenURI: "",
            transferable: true,
            owner: publisherAccount,
        };
        const erc20Params = {
            templateIndex: 1,
            cap: "100000",
            feeAmount: "0",
            paymentCollector: lib_1.ZERO_ADDRESS,
            feeToken: lib_1.ZERO_ADDRESS,
            minter: publisherAccount,
            mpFeeAddress: lib_1.ZERO_ADDRESS,
        };
        const poolParams = {
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
        yield (0, lib_1.approve)(config_1.web3, publisherAccount, addresses.Ocean, addresses.ERC721Factory, poolParams.vestingAmount);
        const tx = yield factory.createNftErc20WithPool(publisherAccount, nftParams, erc20Params, poolParams);
        poolNftAddress = tx.events.NFTCreated.returnValues[0];
        poolDatatokenAddress = tx.events.TokenCreated.returnValues[0];
        poolAddress = tx.events.NewPool.returnValues[0];
        console.log(`Pool NFT address: ${poolNftAddress}`);
        console.log(`Pool Datatoken address: ${poolDatatokenAddress}`);
        console.log(`Pool address: ${poolAddress}`);
        console.log("creating nft");
        const nft = new lib_1.Nft(config_1.web3);
        DDO.chainId = yield config_1.web3.eth.getChainId();
        const checksum = (0, sha256_1.default)(config_1.web3.utils.toChecksumAddress(poolNftAddress) + DDO.chainId.toString(10));
        DDO.id = "did:op:" + checksum;
        DDO.nftAddress = poolNftAddress;
        const encryptedFiles = yield lib_1.ProviderInstance.encrypt(ASSET_URL, providerUrl);
        console.log("encrypted files:", encryptedFiles);
        DDO.services[0].files = encryptedFiles;
        console.log("files");
        DDO.services[0].datatokenAddress = poolDatatokenAddress;
        console.log(`DID: ${DDO.id}`);
        const providerResponse = yield lib_1.ProviderInstance.encrypt(DDO, providerUrl);
        const encryptedDDO = providerResponse;
        const metadataHash = (0, lib_1.getHash)(JSON.stringify(DDO));
        yield nft.setMetadata(poolNftAddress, publisherAccount, 0, providerUrl, "", "0x2", encryptedDDO, "0x" + metadataHash);
        const pool = new lib_1.Pool(config_1.web3);
        yield (0, lib_1.approve)(config_1.web3, stakerAccount, addresses.Ocean, poolAddress, "5", true);
        yield pool.joinswapExternAmountIn(stakerAccount, poolAddress, "5", "0.1");
        const prices = yield pool.getAmountInExactOut(poolAddress, poolDatatokenAddress, addresses.Ocean, "1", "0.01");
        console.log(`Price of 1 ${POOL_NFT_SYMBOL} is ${prices.tokenAmount} OCEAN`);
    });
}
let url = "";
let useLocal = false;
let error = false;
try {
    for (let i = 0; i < process.argv.length; i++) {
        if (process.argv[i].startsWith("fileUrl=")) {
            url = process.argv[i].split("=")[1];
        }
        if (process.argv[i].startsWith("useLocal=")) {
            useLocal = process.argv[i].split("=")[1] === "true";
        }
    }
}
catch (e) {
    console.error("Invalid File URL! Set arguments like this: node index.js fileUrl=<url>");
    error = true;
}
if (error === false) {
    init(url, useLocal);
}
