import util from "util";
import fs from "fs";

const readFile = util.promisify(fs.readFile);

export async function readJSON<T>(path: string): Promise<T> {
  return readFile(path)
    .then(buffer => buffer.toString())
    .then(json => JSON.parse(json));
}

