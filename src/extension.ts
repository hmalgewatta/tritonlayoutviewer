import * as vscode from "vscode";

const cats = {
  "Triton Layout Viewer": "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif",
  "Compiling Cat": "https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif",
  "Testing Cat": "https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif",
};
interface TritonConfig {
  triton_gpu: {
    blocked: {
      sizePerThread: number[];
      threadsPerWarp: number[];
      warpsPerCTA: number[];
      order: number[];
      size: number[];
    };
  };
}

// Function to parse the input string and convert it to an object
function parseTritonConfig(input: string): TritonConfig {
  // Regular expression to extract key-value pairs inside the <>
  const regex = /(\w+)\s*=\s*\[([0-9, ]+)\]/g;

  // Object to store the result
  const result: TritonConfig = {
    triton_gpu: {
      blocked: {
        sizePerThread: [],
        threadsPerWarp: [],
        warpsPerCTA: [],
        order: [],
        size: []
      }
    }
  };

  // Match the regex and extract the key-value pairs
  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    const key = match[1]; // e.g., sizePerThread
    const values = match[2].split(',').map(Number); // e.g., [1, 8] becomes [1, 8]

    // Assign the values to the correct key in the object
    if (key === 'sizePerThread') {
      result.triton_gpu.blocked.sizePerThread = values;
    } else if (key === 'threadsPerWarp') {
      result.triton_gpu.blocked.threadsPerWarp = values;
    } else if (key === 'warpsPerCTA') {
      result.triton_gpu.blocked.warpsPerCTA = values;
    } else if (key === 'order') {
      result.triton_gpu.blocked.order = values;
    }
  }

  return result;
}

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
    
    const selectionPosition = selection.start;
    const lineToParse = selection.active.line
    const textToParse = editor.document.lineAt(lineToParse).text.substring(0, selectionPosition.character);
    console.log('textToParse', textToParse);
    const tensorPattern = new RegExp(`tensor<(?!.*tensor<)[0-9a-z!<>\.]*`, 'i');
    let tensorMatch = textToParse.match(tensorPattern);
    const tensorSize = tensorMatch ? tensorMatch[0].substring(7).split('x') : '';
    console.log('tensorSize', tensorSize);

    if (!tensorSize || tensorSize.length != 3) {
        vscode.window.showInformationMessage('Invalid size found');
        return;
    }

    // Get all text from the beginning of the document to the current selection
    const fullText = editor.document.getText();
    const lines = fullText.split('\n');
    console.log('selectedText', `${selectedText}>>>`);
    // Pattern to match: # followed by the selected text
    const searchPattern = new RegExp(`^#\\s*${selectedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=\\s*.+`, 'i');
    
    let declarationLine = -1;
    let declarationCharacter = -1;

    // Search through lines to find the first declaration
    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(searchPattern);
        if (match && match.index !== undefined) {
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
    const end = new vscode.Position(declarationLine, editor.document.lineAt(declarationLine).text.length);
    // const range = new vscode.Range(position, position.translate(0, selectedText.length + 1));
    const range = new vscode.Range(position, end);
    
    // Reveal the declaration
    editor.selection = new vscode.Selection(range.start, range.end);
    const foundDeclaration = editor.document.lineAt(declarationLine).text;
    const parsedConfig = parseTritonConfig(foundDeclaration);
    parsedConfig.triton_gpu.blocked.size = tensorSize.slice(0,2).map(Number);
    console.log('parsedConfig', parsedConfig);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    console.log('found', foundDeclaration, editor.document.lineAt(declarationLine).text);
    // CatCodingPanel.createOrShow(context.extensionUri, parsedConfig);
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    const panel = vscode.window.createWebviewPanel(
      'waveVisualization',
      'Wave Visualization',
      column || vscode.ViewColumn.One,
      getWebviewOptions(context.extensionUri)
  );
    const nonce = getNonce();

    const cssPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'vscode.css');
    const scriptPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'main.js');
    const cssUri = panel.webview.asWebviewUri(cssPath);
    const scriptUri = panel.webview.asWebviewUri(scriptPath);
    console.log('scriptUri', scriptUri.toString());


    // Set HTML content
    panel.webview.html = getWebviewContent(cssUri.toString(), scriptUri.toString(), nonce);

    // Send initialization data to webview
    panel.webview.postMessage({
        command: 'initialize',
        data: parsedConfig
    });

});

function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
  return {
    // Enable javascript in the webview
    enableScripts: true,

    // And restrict the webview to only loading content from our extension's `media` directory.
    localResourceRoots: [vscode.Uri.joinPath(extensionUri, "media")],
  };
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

function getWebviewContent(cssUri: string, scriptUri: string, nonce: string) {
  return `<!DOCTYPE html>
  <html>
  <head>
      <link rel="stylesheet" href="${cssUri}" nonce="${nonce}">
  </head>
  <body>
      <div class="container">
          <div class="k-label" id="kLabel">K=128</div>
          <div class="m-label" id="mLabel">M=128</div>
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
          <div class="wave-grid" id="waveGrid"></div>
      </div>
      <script src="${scriptUri}" nonce="${nonce}"></script>
  </body>
  </html>`;
}