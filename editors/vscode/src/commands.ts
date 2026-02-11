import * as vscode from "vscode";
import { Client } from "./client";

export function registerCommands(context: vscode.ExtensionContext, client: Client, outputChannel: vscode.OutputChannel, traceOutputChannel: vscode.OutputChannel): vscode.Disposable[] {
    const disposables: vscode.Disposable[] = [];

    disposables.push(vscode.commands.registerCommand("vue-tsgo.restart", () => {
        return client.restart(context);
    }));

    disposables.push(vscode.commands.registerCommand("vue-tsgo.output.focus", () => {
        outputChannel.show();
    }));

    disposables.push(vscode.commands.registerCommand("vue-tsgo.lsp-trace.focus", () => {
        traceOutputChannel.show();
    }));

    disposables.push(vscode.commands.registerCommand("vue-tsgo.showMenu", showCommands));

    disposables.push(vscode.commands.registerCommand("vue-tsgo.reportIssue", () => {
        vscode.commands.executeCommand("workbench.action.openIssueReporter", {
            extensionId: "NikhilVerma.vue-tsgo",
        });
    }));

    return disposables;
}

async function showCommands(): Promise<void> {
    const commands: readonly { label: string; description: string; command: string; }[] = [
        {
            label: "$(refresh) Restart Server",
            description: "Restart the vue-tsgo language server",
            command: "vue-tsgo.restart",
        },
        {
            label: "$(output) Show Server Log",
            description: "Show the vue-tsgo server log",
            command: "vue-tsgo.output.focus",
        },
        {
            label: "$(debug-console) Show LSP Messages",
            description: "Show the LSP communication trace",
            command: "vue-tsgo.lsp-trace.focus",
        },
        {
            label: "$(report) Report Issue",
            description: "Report an issue with vue-tsgo",
            command: "vue-tsgo.reportIssue",
        },
    ];

    const selected = await vscode.window.showQuickPick(commands, {
        placeHolder: "vue-tsgo Commands",
    });

    if (selected) {
        await vscode.commands.executeCommand(selected.command);
    }
}
