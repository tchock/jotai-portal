/* eslint-disable no-undef */
import { resolve } from 'path'

const __dirname = import.meta.dirname

export const PACKAGE_DIR = resolve(__dirname, '..')
export const DIST_DIR = resolve(PACKAGE_DIR, 'dist')
export const SRC_DIR = resolve(PACKAGE_DIR, 'src')
export const VERSION = process.env.VERSION || 'v0.0.1'
