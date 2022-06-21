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
exports.getAddresses = exports.getTestConfig = exports.web3 = exports.GAS_PRICE = void 0;
const web3_1 = __importDefault(require("web3"));
const fs = __importStar(require("fs"));
const os_1 = require("os");
const lib_1 = require("@oceanprotocol/lib");
lib_1.LoggerInstance.setLevel(lib_1.LogLevel.Error);
exports.GAS_PRICE = "3000000000";
exports.web3 = new web3_1.default(process.env.NODE_URI || lib_1.configHelperNetworks[1].nodeUri);
const getTestConfig = (web3) => __awaiter(void 0, void 0, void 0, function* () {
    const config = new lib_1.ConfigHelper().getConfig(yield web3.eth.getChainId());
    config.providerUri = process.env.PROVIDER_URL || config.providerUri;
    return config;
});
exports.getTestConfig = getTestConfig;
const getAddresses = () => {
    const data = JSON.parse(
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.readFileSync(process.env.ADDRESS_FILE ||
        `${os_1.homedir}/.ocean/ocean-contracts/artifacts/address.json`, "utf8"));
    return data.development;
};
exports.getAddresses = getAddresses;
