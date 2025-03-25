declare interface Window {
  electronAPI: {
    auth: {
      login: (username: string, password: string) => Promise<any>;
      logout: () => Promise<void>;
    };
    connection: {
      create: (data: any) => Promise<any>;
      update: (id: number, data: any) => Promise<any>;
      delete: (id: number) => Promise<boolean>;
      getAll: () => Promise<any[]>;
      getById: (id: number) => Promise<any>;
      test: (data: any) => Promise<any>;
      open: (id: number) => Promise<any>;
    };
    query: {
      execute: (connectionId: number, sql: string) => Promise<any>;
      getStructure: (connectionId: number) => Promise<any[]>;
      getTables: (connectionId: number, database: string, schema?: string) => Promise<any[]>;
      getViews: (connectionId: number, database: string, schema?: string) => Promise<any[]>;
      getTableStructure: (connectionId: number, tableName: string) => Promise<any[]>;
    };
    dialog: {
      openFile: () => Promise<string | undefined>;
    };
  };
} 