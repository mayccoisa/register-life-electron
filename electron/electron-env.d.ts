export interface IpcRenderer {
    on(channel: string, listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void): this
    off(channel: string, listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void): this
    send(channel: string, ...args: any[]): void
    invoke(channel: string, ...args: any[]): Promise<any>
}

declare global {
    interface Window {
        ipcRenderer: IpcRenderer
    }
}
