export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
  isFinal?: boolean;
}

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export interface KnowledgeSource {
  id: string;
  name: string;
  type: 'file' | 'sheet' | 'social';
  icon: string;
  status: 'active' | 'syncing' | 'inactive';
  details: string;
}

export interface VisualizerState {
  volume: number; // 0 to 1
}

export type Language = 'en' | 'vi';