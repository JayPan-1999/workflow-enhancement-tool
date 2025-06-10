export interface FileType {
    name: string;
    required: boolean;
    fileType: string;
    backendField: string;
}

export interface PreviewFileParams {
    pageNo?: number,
    [key: string]: any
}


export interface FileCategory {
    label: string;
    value: string;
    files: FileType[];
}

export interface TenantType {
    label: string;
    value: string;
}

export interface UploadedFile {
    categoryId: string;
    fileTypeId: string;
    file: File;
    previewUrl?: string;
    backendField: string;
}

export interface TableField {
    fieldName: string;
    value: string | number;
    editable: boolean;
}

export interface TableData {
    id: string;
    category: string;
    fileName: string;
    fields: TableField[];
}

export interface ApiResponse {
    success: boolean;
    data?: TableData[];
    fields?: string[];
    message?: string;
    jsonData?: Record<string, any>;
}

export interface JsonTab {
    name: string;
    type: 'object' | 'array';
    data: any;
}

export interface NestedTableData {
    header: string[];
    rows: any[][];
} 