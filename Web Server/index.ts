import http from 'http'
import * as fs from 'fs'
import path from 'path'
import { initFileServer } from './fileserver'

require('dotenv').config()

initFileServer()