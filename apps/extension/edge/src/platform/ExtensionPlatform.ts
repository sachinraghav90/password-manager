// ─── Adapter interfaces ──────────────────────────────────────────────────────

export interface RuntimeAdapter {
  sendMessage(message: any): Promise<any>;
  onMessage: {
    addListener(
      callback: (
        message: any,
        sender: any,
        sendResponse: (response?: any) => void
      ) => boolean | void
    ): void;
  };
  id: string;
  getURL(path: string): string;
  openOptionsPage(): Promise<void>;
}

export interface StorageLocalAdapter {
  get(keys: string | string[] | Record<string, any> | null): Promise<Record<string, any>>;
  set(items: Record<string, any>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
}

export interface TabsAdapter {
  query(queryInfo: any): Promise<any[]>;
}

export interface ScriptingAdapter {
  executeScript(injection: any): Promise<any[]>;
}

export interface CommandsAdapter {
  onCommand: { addListener(callback: (command: string) => void): void };
}

export interface ContextMenuAdapter {
  create(createProperties: chrome.contextMenus.CreateProperties, callback?: () => void): void;
}

export interface CreateWindowOptions {
  url: string;
  type?: 'normal' | 'popup' | 'panel';
  width?: number;
  height?: number;
  focused?: boolean;
}

export interface WindowsAdapter {
  create(options: CreateWindowOptions): Promise<void>;
}

/** Full platform abstraction — never scatter raw browser API calls */
export interface ExtensionPlatform {
  runtime: RuntimeAdapter;
  storage: StorageLocalAdapter;
  tabs: TabsAdapter;
  scripting: ScriptingAdapter;
  commands: CommandsAdapter;
  contextMenus: ContextMenuAdapter;
  windows: WindowsAdapter;
}
