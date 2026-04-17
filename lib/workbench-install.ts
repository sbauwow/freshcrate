import * as fs from "fs";
import * as path from "path";

const scriptsRoot = path.join(process.cwd(), "scripts");
const bootstrapCommonPath = path.join(scriptsRoot, "lib", "bootstrap-common.sh");
const bootstrapScriptPath = path.join(scriptsRoot, "bootstrap-agent-edition.sh");

export function getHostedAgentEditionInstallScript(): string {
  const common = fs.readFileSync(bootstrapCommonPath, "utf8").trim();
  const bootstrapLines = fs.readFileSync(bootstrapScriptPath, "utf8").trim().split("\n");
  const bootstrap = bootstrapLines.slice(6).join("\n").trim();

  return `${common}\n\n${bootstrap}\n`;
}
