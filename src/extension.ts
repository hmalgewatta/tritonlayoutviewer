import * as vscode from "vscode";

const cats = {
  "Triton Layout Viewer": "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif",
  "Compiling Cat": "https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif",
  "Testing Cat": "https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif",
};

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('tritonlayoutviewer.findDeclaration', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage('No active editor found');
        return;
    }

    // Get the selected text
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    if (!selectedText) {
        vscode.window.showInformationMessage('Please select some text first');
        return;
    }

    // Get all text from the beginning of the document to the current selection
    const fullText = editor.document.getText();
    const lines = fullText.split('\n');
    
    // Pattern to match: # followed by the selected text
    const searchPattern = new RegExp(`#\\s*${selectedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    
    let declarationLine = -1;
    let declarationCharacter = -1;

    // Search through lines to find the first declaration
    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(searchPattern);
        if (match && match.index) {
            declarationLine = i;
            declarationCharacter = match.index;
            break;
        }
    }

    if (declarationLine === -1) {
        vscode.window.showInformationMessage(`No declaration found for "${selectedText}"`);
        return;
    }

    // Create a selection at the found declaration
    const position = new vscode.Position(declarationLine, declarationCharacter);
    const range = new vscode.Range(position, position.translate(0, selectedText.length + 1));
    
    // Reveal the declaration
    editor.selection = new vscode.Selection(range.start, range.end);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    CatCodingPanel.createOrShow(context.extensionUri);
});

context.subscriptions.push(disposable);
  context.subscriptions.push(
    vscode.commands.registerCommand("catCoding.start", () => {
      CatCodingPanel.createOrShow(context.extensionUri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("catCoding.doRefactor", () => {
      if (CatCodingPanel.currentPanel) {
        CatCodingPanel.currentPanel.doRefactor();
      }
    })
  );

  if (vscode.window.registerWebviewPanelSerializer) {
    // Make sure we register a serializer in activation event
    vscode.window.registerWebviewPanelSerializer(CatCodingPanel.viewType, {
      async deserializeWebviewPanel(
        webviewPanel: vscode.WebviewPanel,
        state: unknown
      ) {
        console.log(`Got state: ${state}`);
        // Reset the webview options so we use latest uri for `localResourceRoots`.
        webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
        CatCodingPanel.revive(webviewPanel, context.extensionUri);
      },
    });
  }
}

function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
  return {
    // Enable javascript in the webview
    enableScripts: true,

    // And restrict the webview to only loading content from our extension's `media` directory.
    localResourceRoots: [vscode.Uri.joinPath(extensionUri, "media")],
  };
}

/**
 * Manages cat coding webview panels
 */
class CatCodingPanel {
  /**
   * Track the currently panel. Only allow a single panel to exist at a time.
   */
  public static currentPanel: CatCodingPanel | undefined;

  public static readonly viewType = "catCoding";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it.
    if (CatCodingPanel.currentPanel) {
      CatCodingPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      CatCodingPanel.viewType,
      "Cat Coding",
      column || vscode.ViewColumn.One,
      getWebviewOptions(extensionUri)
    );

    CatCodingPanel.currentPanel = new CatCodingPanel(panel, extensionUri);
  }

  public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    CatCodingPanel.currentPanel = new CatCodingPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set the webview's initial html content
    this._update();
    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programmatically
    // this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // // Update the content based on view changes
    // this._panel.onDidChangeViewState(
    //   () => {
    //     if (this._panel.visible) {
    //       this._update();
    //     }
    //   },
    //   null,
    //   this._disposables
    // );

    // // Handle messages from the webview
    // this._panel.webview.onDidReceiveMessage(
    //   (message) => {
    //     switch (message.command) {
    //       case "alert":
    //         vscode.window.showErrorMessage(message.text);
    //         return;
    //     }
    //   },
    //   null,
    //   this._disposables
    // );
  }

  public doRefactor() {
    // Send a message to the webview webview.
    // You can send any JSON serializable data.
    this._panel.webview.postMessage({ command: "refactor" });
  }

  public dispose() {
    CatCodingPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _update() {
    const webview = this._panel.webview;

    // Vary the webview's content based on where it is located in the editor.
    // switch (this._panel.viewColumn) {
    //   case vscode.ViewColumn.Two:
    //     this._updateForCat(webview, "Compiling Cat");
    //     return;

    //   case vscode.ViewColumn.Three:
    //     this._updateForCat(webview, "Testing Cat");
    //     return;

    //   case vscode.ViewColumn.One:
    //   default:
    //     this._updateForCat(webview, "Coding Cat");
    //     return;
    // }
        this._updateForCat(webview, "Triton Layout Viewer");
  }

  private _updateForCat(webview: vscode.Webview, catName: keyof typeof cats) {
    this._panel.title = catName;
    this._panel.webview.html = this._getHtmlForWebview(webview, cats[catName]);
  }

  private _getHtmlForWebview(webview: vscode.Webview, catGifPath: string) {
    // Local path to main script run in the webview
    const scriptPathOnDisk = vscode.Uri.joinPath(
      this._extensionUri,
      "media",
      "main.js"
    );

    // And the uri we use to load this script in the webview
    const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

    // Local path to css styles
    const styleResetPath = vscode.Uri.joinPath(
      this._extensionUri,
      "media",
      "reset.css"
    );
    const stylesPathMainPath = vscode.Uri.joinPath(
      this._extensionUri,
      "media",
      "vscode.css"
    );

    // Uri to load styles into webview
    const stylesResetUri = webview.asWebviewUri(styleResetPath);
    const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);

    // Use a nonce to only allow specific scripts to be run		const scriptUri = webview.asWebviewUri(scriptPathOnDisk);
    const nonce = getNonce();

    // return `<!DOCTYPE html>
    // 	<html lang="en">
    // 	<head>
    // 		<meta charset="UTF-8">

    // 		<!--
    // 			Use a content security policy to only allow loading images from https or from our extension directory,
    // 			and only allow scripts that have a specific nonce.
    // 		-->
    // 		<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">

    // 		<meta name="viewport" content="width=device-width, initial-scale=1.0">

    // 		<link href="${stylesResetUri}" rel="stylesheet">
    // 		<link href="${stylesMainUri}" rel="stylesheet">

    // 		<title>Cat Coding</title>
    // 	</head>
    // 	<body>
    // 		<img src="${catGifPath}" width="300" />
    // 		<h1 id="lines-of-code-counter">0</h1>

    // 		<script nonce="${nonce}" src="${scriptUri}"></script>
    // 	</body>
    // 	</html>`;

    return `<!DOCTYPE html>
<html>
<meta charset="UTF-8">

		<!--
			Use a content security policy to only allow loading images from https or from our extension directory,
			and only allow scripts that have a specific nonce.
		-->
		<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">

		<meta name="viewport" content="width=device-width, initial-scale=1.0">

		<link href="${stylesResetUri}" rel="stylesheet">
		<link href="${stylesMainUri}" rel="stylesheet">

		<title>Triton Layout Viewer</title>
<head>
  <style>
    .container {
      position: relative;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
    }

    .wave-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      border: 1px solid black;
    }

    .wave-block {
      border: 1px solid black;
    }

    .wave-cell {
      position: relative;
      height: 96px;
      border-bottom: 1px solid black;
    }

    .wave-cell:last-child {
      border-bottom: none;
    }

    .wave-label {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      z-index: 2;
    }

    .wave-segments {
      position: absolute;
      inset: 0;
      display: grid;
      grid-template-columns: repeat(8, 1fr);
    }

    .wave-segment {
      border-right: 1px solid #ccc;
    }

    .wave-segment:last-child {
      border-right: none;
    }

    .wave-segment.filled {
      background-color: #bfdbfe;
    }

    .red-indicator {
      position: absolute;
      top: 0;
      left: 0;
    //   width: 24px;
    //   height: 4px;
      background-color: red;
      z-index: 2;
    }

    .k-label {
      position: absolute;
      top: -24px;
      left: 50%;
      transform: translateX(-50%);
    }

    .m-label {
      position: absolute;
      left: -24px;
      top: 50%;
      transform: translateY(-50%) rotate(-90deg);
      transform-origin: center;
    }

    .t0-container {
      position: absolute;
      top: -24px;
      left: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .t0-grid {
      width: 64px;
      height: 16px;
      border: 1px solid black;
      display: grid;
      grid-template-columns: repeat(8, 1fr);
    }

    .t0-segment {
      border-right: 1px solid black;
    }

    .t0-segment:last-child {
      border-right: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Labels -->
    <div class="k-label">K=128</div>
    <div class="m-label">M=128</div>
    <div class="t0-container">
      <span>t₀</span>
      <div class="t0-grid">
        <div class="t0-segment"></div>
        <div class="t0-segment"></div>
        <div class="t0-segment"></div>
        <div class="t0-segment"></div>
        <div class="t0-segment"></div>
        <div class="t0-segment"></div>
        <div class="t0-segment"></div>
        <div class="t0-segment"></div>
      </div>
      <span>1×8</span>
    </div>

    <!-- Main Grid -->
    <div class="wave-grid" id="waveGrid"></div>
  </div>

  <script nonce="${nonce}">
    function createWaveCell(level) {
      const cell = document.createElement('div');
      cell.className = 'wave-cell';

      // Add wave label
      const label = document.createElement('div');
      label.className = 'wave-label';
      label.textContent = 'wave' + level;
      cell.appendChild(label);

      // Add segments and blue pattern for wave0
      if (level === 0) {
        const segments = document.createElement('div');
        segments.className = 'wave-segments';
        
        for (let i = 0; i < 8; i++) {
          const segment = document.createElement('div');
          segment.className = ['wave-segment', i < 2 ? 'filled' : ''].filter(Boolean).join(' ');
          segments.appendChild(segment);
        }
        
        cell.appendChild(segments);

        // Add red indicator
        const indicator = document.createElement('div');
        indicator.className = 'red-indicator';
        cell.appendChild(indicator);
      }

      return cell;
    }

    function createWaveBlock() {
      const block = document.createElement('div');
      block.className = 'wave-block';
      
      for (let i = 0; i < 4; i++) {
        block.appendChild(createWaveCell(i));
      }
      
      return block;
    }

    function initializeGrid() {
      const grid = document.getElementById('waveGrid');
      
      for (let i = 0; i < 8; i++) {
        grid.appendChild(createWaveBlock());
      }
    }

    // Initialize the visualization
    initializeGrid();
    // document.addEventListener('DOMContentLoaded', initializeGrid);
  </script>
</body>
</html>`;

    return `<!DOCTYPE html>
<html>
		<meta charset="UTF-8">

		<!--
			Use a content security policy to only allow loading images from https or from our extension directory,
			and only allow scripts that have a specific nonce.
		-->
		<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">

		<meta name="viewport" content="width=device-width, initial-scale=1.0">

		<link href="${stylesResetUri}" rel="stylesheet">
		<link href="${stylesMainUri}" rel="stylesheet">

		<title>Triton Layout Viewer</title>
<body>
  <div class="container">
    <!-- Labels -->
    <div class="k-label">K=128</div>
    <div class="m-label">M=128</div>
    <div class="t0-container">
      <span>t₀</span>
      <div class="t0-grid">
        <div class="t0-segment"></div>
        <div class="t0-segment"></div>
        <div class="t0-segment"></div>
        <div class="t0-segment"></div>
        <div class="t0-segment"></div>
        <div class="t0-segment"></div>
        <div class="t0-segment"></div>
        <div class="t0-segment"></div>
      </div>
      <span>1×8</span>
    </div>

    <!-- Main Grid -->
    <div class="wave-grid" id="waveGrid"></div>
  </div>
	<script nonce="${nonce}" src="${scriptUri}"></script> 
</body>
</html>`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
