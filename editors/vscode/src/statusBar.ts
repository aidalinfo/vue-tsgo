import * as vscode from "vscode";

export function setupStatusBar(): vscode.Disposable {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(beaker) vue-tsgo";
    statusBarItem.tooltip = "vue-tsgo Vue Language Server";
    statusBarItem.command = "vue-tsgo.showMenu";
    statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
    statusBarItem.show();
    return statusBarItem;
}
