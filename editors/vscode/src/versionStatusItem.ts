import * as vscode from "vscode";
import { Client } from "./client";
import { jsTsLanguageModes } from "./util";

export function setupVersionStatusItem(
    client: Client,
): vscode.Disposable[] {
    const statusItem = vscode.languages.createLanguageStatusItem("vue-tsgo.version", jsTsLanguageModes);
    statusItem.name = "vue-tsgo version";
    statusItem.detail = "vue-tsgo version";
    return [
        statusItem,
        client.onStarted(() => {
            statusItem.text = client.getCurrentExe()!.version;
        }),
    ];
}
