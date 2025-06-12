<template>
  <div class="app-container">
    <!-- Header with dropdown -->
    <div class="header-section">
      <h2 class="text-center mb-lg">HKLand Lease Document Management</h2>
      <el-form label-position="top">
        <el-form-item label="Select Document Category">
          <el-select v-model="selectedCategory" placeholder="Select category" @change="handleCategoryChange">
            <el-option v-for="category in fileCategories" :key="category.value" :label="category.label"
              :value="category.value" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <!-- Split screen layout -->
    <div class="main-content">
      <!-- Left panel -->
      <div class="left-panel">
        <div v-if="selectedCategory" class="upload-section">
          <h3 class="mb-md">Upload Required Files</h3>
          <div class="required-files">
            <div v-for="fileType in getRequiredFiles()" :key="fileType.name" class="file-upload-item">
              <div class="file-type-name">
                {{ fileType.name }}
                <el-tag v-if="fileType.required" type="danger" size="small">Required</el-tag>
              </div>
              <el-upload :ref="setFileUploadRef" action="#" :auto-upload="false" :limit="1" :accept="fileType.fileType"
                :on-change="(file: any) => handleFileChange(file, fileType)"
                :on-remove="() => handleFileRemove(fileType.name)">
                <el-button type="primary">Upload {{ fileType.name }}</el-button>
              </el-upload>
              <div v-if="getUploadedFile(fileType.backendField)" class="uploaded-file mt-sm">
                <el-tag type="success">
                  <el-text truncated class="uploaded-file-text">{{ getUploadedFile(fileType.backendField)?.file.name
                    }}</el-text>
                </el-tag>
                <el-button type="text" @click="previewFile(fileType.backendField)">Preview</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right panel -->
      <div class="right-panel">
        <div v-if="jsonTabs.length > 0" class="results-section">
          <el-tabs v-model="activeTab" type="border-card">
            <el-tab-pane v-for="(tab, index) in jsonTabs" :key="tab.name" :label="tab.name" :name="String(index)">
              <!-- Object data shown as Description list -->
              <div v-if="tab.type === 'object'" class="tab-content-object">
                <!-- Display primitive fields as descriptions -->
                <el-descriptions :title="tab.name" :column="2" border>
                  <template v-for="(value, key) in tab.data" :key="key">
                    <!-- Only display primitive values in descriptions -->
                    <el-descriptions-item v-if="typeof value !== 'object' || value === null">
                      <template #label>
                        <div class="header-with-icon">
                          <el-tooltip :content="key" placement="top" :show-after="500">
                            <span class="truncated-text">{{ key }}</span>
                          </el-tooltip>
                          <el-tooltip :content="getColumnDescription(tab, key)" placement="top">
                            <el-icon class="question-icon">
                              <QuestionFilled />
                            </el-icon>
                          </el-tooltip>
                        </div>
                      </template>
                      <div class="field-with-edit">
                        <el-tooltip :content="String(value)" placement="top" :show-after="500">
                          <span class="field-item truncated-text" @click="jumpToPreview(tab, key)">{{ value }}</span>
                        </el-tooltip>
                        <el-icon class="edit-icon" @click="handleEdit(tab.data, key)">
                          <Edit />
                        </el-icon>
                      </div>
                    </el-descriptions-item>
                  </template>
                </el-descriptions>

                <!-- Display array data as separate tables -->
                <div v-for="(value, key) in tab.data" :key="`table-${key}`">
                  <div v-if="Array.isArray(value)" class="nested-table-container">
                    <h4>{{ key }}</h4>
                    <div class="table-actions">
                      <!-- <el-button @click="exportNestedTable(value, key)" size="small" type="primary">Export as
                        Excel</el-button>
                      <el-button @click="exportNestedTable(value, key, 'CSV')" size="small" type="primary">Export as
                        CSV</el-button> -->
                    </div>
                    <el-table border :data="convertArrayToTableData(value)" style="width: 100%">
                      <el-table-column v-for="header in getNestedTableHeaders(value)" :key="header" :prop="header"
                        :label="header" header-class-name="custom-table-header">
                        <template #header>
                          <div class="header-with-icon">
                            <el-tooltip :content="header" placement="top" :show-after="500">
                              <span class="truncated-text">{{ header }}</span>
                            </el-tooltip>
                            <el-tooltip :content="getColumnDescription(tab, key, header)" placement="top">
                              <el-icon class="question-icon">
                                <QuestionFilled />
                              </el-icon>
                            </el-tooltip>
                          </div>
                        </template>
                        <template #default="scope">
                          <div class="field-with-edit">
                            <el-tooltip :content="String(scope.row[header])" placement="top" :show-after="500">
                              <span class="field-item truncated-text" @click="jumpToPreview(tab, key, header)">{{
                                scope.row[header] }}</span>
                            </el-tooltip>
                            <el-icon class="edit-icon" @click="handleEdit(scope.row, header)">
                              <Edit />
                            </el-icon>
                          </div>
                        </template>
                      </el-table-column>
                    </el-table>
                  </div>
                </div>

                <!-- Display nested objects as separate descriptions -->
                <div v-for="(value, key) in tab.data" :key="`obj-${key}`">
                  <div v-if="typeof value === 'object' && !Array.isArray(value) && value !== null"
                    class="nested-object-container">
                    <h4>{{ key }}</h4>
                    <el-descriptions :column="1" border size="small">
                      <el-descriptions-item v-for="(nestedValue, nestedKey) in value" :key="nestedKey">
                        <template #label>
                          <div class="header-with-icon">
                            <el-tooltip :content="nestedKey" placement="top" :show-after="500">
                              <span class="truncated-text">{{ nestedKey }}</span>
                            </el-tooltip>
                            <el-tooltip :content="getColumnDescription(tab, nestedKey)" placement="top">
                              <el-icon class="question-icon">
                                <QuestionFilled />
                              </el-icon>
                            </el-tooltip>
                          </div>
                        </template>
                        <div class="field-with-edit">
                          <el-tooltip :content="String(nestedValue)" placement="top" :show-after="500">
                            <span class="field-item truncated-text" @click="jumpToPreview(tab, nestedKey)">{{
                              nestedValue }}</span>
                          </el-tooltip>
                          <el-icon class="edit-icon" @click="handleEdit(value, nestedKey)">
                            <Edit />
                          </el-icon>
                        </div>
                      </el-descriptions-item>
                    </el-descriptions>
                  </div>
                </div>
              </div>

              <!-- Array data shown as Table -->
              <div v-else-if="tab.type === 'array'" class="tab-content-array">
                <div class="table-actions">
                  <!-- <el-button @click="exportNestedTable(tab.data, tab.name)" size="small" type="primary">Export as
                    Excel</el-button>
                  <el-button @click="exportNestedTable(tab.data, tab.name, 'CSV')" size="small" type="primary">Export as
                    CSV</el-button> -->
                </div>
                <el-table border :data="convertArrayToTableData(tab.data)" style="width: 100%">
                  <el-table-column v-for="header in getNestedTableHeaders(tab.data)" :key="header" :prop="header"
                    :label="header" header-class-name="custom-table-header">
                    <template #header>
                      <div class="header-with-icon">
                        <el-tooltip :content="header" placement="top" :show-after="500">
                          <span class="truncated-text">{{ header }}</span>
                        </el-tooltip>
                        <el-tooltip :content="getColumnDescription(tab, header)" placement="top">
                          <el-icon class="question-icon">
                            <QuestionFilled />
                          </el-icon>
                        </el-tooltip>
                      </div>
                    </template>
                    <template #default="scope">
                      <div class="field-with-edit">
                        <el-tooltip :content="String(scope.row[header])" placement="top" :show-after="500">
                          <span class="field-item truncated-text" @click="jumpToPreview(tab, header)">{{
                            scope.row[header] }}</span>
                        </el-tooltip>
                        <el-icon class="edit-icon" @click="handleEdit(scope.row, header)">
                          <Edit />
                        </el-icon>
                      </div>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="action-buttons flex-center mt-lg" v-if="selectedCategory && hasUploadedFiles">
      <el-button type="primary" @click="generateValue" :loading="isGenerating" :disabled="!canGenerate">Generate
        Value</el-button>
    </div>

    <!-- Preview dialog -->
    <el-dialog v-model="previewDialogVisible" width="80%" :show-close="false" draggable
      :fullscreen="isDialogFullScreen">
      <template #header="{ close, titleId, titleClass }">
        <div class="dialog-header">
          <h4 :id="titleId" :class="titleClass">File Preview</h4>
          <div>
            <el-button @click="openPreviewInNewTab">
              <el-icon class="el-icon--left">
                <View />
              </el-icon>
              Open in New Tab
            </el-button>
            <el-button @click="isDialogFullScreen = !isDialogFullScreen">
              <el-icon class="el-icon--left">
                <FullScreen />
              </el-icon>
              Full Screen
            </el-button>
            <el-button type="danger" @click="close">
              <el-icon class="el-icon--left">
                <CircleCloseFilled />
              </el-icon>
              Close
            </el-button>
          </div>
        </div>
      </template>
      <div class="preview-container">
        <iframe v-if="currentPreviewType === 'pdf'" :src="currentPreviewUrl" width="100%"></iframe>
        <img v-else-if="currentPreviewType === 'image'" :src="currentPreviewUrl" style="max-width: 100%" />
        <iframe v-else-if="currentPreviewType === 'powerpoint'" :src="currentPreviewUrl" width="100%"
          height="600"></iframe>
        <div v-else class="preview-not-available">
          <p>Preview not available for this file type.</p>
          <el-button type="primary" @click="downloadFile">Download File</el-button>
        </div>
      </div>
    </el-dialog>

    <!-- Add edit dialog -->
    <el-dialog v-model="editDialogVisible" title="Edit Field" width="30%">
      <el-form>
        <el-form-item label="Value">
          <el-input v-model="editingValue" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialogVisible = false">Cancel</el-button>
          <el-button type="primary" @click="handleEditSave">Save</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeMount } from "vue";
import { ElNotification } from "element-plus";
import type { UploadUserFile } from "element-plus";
import * as XLSX from "xlsx";
import * as FileSaver from "file-saver";
import type {
  FileCategory,
  FileType,
  UploadedFile,
  JsonTab,
  PreviewFileParams,
} from "../types";
import axios from "axios";
import fileUploadJson from "../assets/file-upload.json"
import localFieldMapJson from '../assets/local-field-map.json'
import descriptionFieldMapJson from '../assets/description-field-map.json'
import { Edit, QuestionFilled } from '@element-plus/icons-vue'

// Define file categories
const fileCategories = ref<FileCategory[]>([
  {
    label: "New Letting (Office)",
    value: "New Letting (Office)",
    files: [
      { name: "Signed Lease", required: true, fileType: ".pdf", backendField: "signed_lease" },
      { name: "Side Letter", required: false, fileType: ".pdf", backendField: "signed_side_letter" },
      { name: "MC PC Summary", required: true, fileType: ".pdf", backendField: "mc_pc_summary" },
      { name: "Deposit Fact Sheet", required: true, fileType: ".pdf", backendField: "deposit_fact_sheet" },
      { name: "Contact Info E-mail", required: false, fileType: ".xlsx,.xls", backendField: "lms_tenant_email" },
    ],
  },
  {
    label: "Finance",
    value: "finance",
    files: [
      { name: "New Lettering", required: true, fileType: ".pdf", backendField: "new_lettering" },
      { name: "Email", required: true, fileType: ".pdf", backendField: "email" },
      { name: "Employee", required: true, fileType: ".pdf", backendField: "employee" },
    ],
  },
]);


// Refs and state
const selectedCategory = ref("");
const uploadedFiles = ref<UploadedFile[]>([]);
const anyTypeFiles = ref<UploadUserFile[]>([]);
const fileUploadRefs = ref<any[]>([]);
const previewDialogVisible = ref(false);
const currentPreviewUrl = ref("");
const currentPreviewType = ref("");
const currentPreviewFile = ref<File | null>(null);
const isGenerating = ref(false);
const isDialogFullScreen = ref(false);

// New refs for dynamic JSON data
const jsonTabs = ref<JsonTab[]>([]);
const activeTab = ref("0");

// Add new refs for edit functionality
const editDialogVisible = ref(false);
const editingValue = ref('');
const editingContext = ref<{
  data: any;
  key: string;
  type: 'table' | 'description';
} | null>(null);

// Computed properties
const hasUploadedFiles = computed(() => {
  if (selectedCategory.value === "no-type") {
    return anyTypeFiles.value.length > 0;
  } else {
    return uploadedFiles.value.some((f) => f.categoryId === selectedCategory.value);
  }
});

const canGenerate = computed(() => {
  if (selectedCategory.value === "no-type") {
    return anyTypeFiles.value.length > 0;
  } else {
    const requiredFiles = getRequiredFiles().filter((file) => file.required);
    return requiredFiles.every((file) =>
      uploadedFiles.value.some(
        (f) => f.categoryId === selectedCategory.value && f.fileTypeId === file.name
      )
    );
  }
});

// Lifecycle hooks
onBeforeMount(() => {
  // Initialize with the default file upload JSON data
});

// Methods
function setFileUploadRef(el: any) {
  if (el) {
    fileUploadRefs.value.push(el);
  }
}

function getColumnDescription(tab: JsonTab, field: any, nestedField?: any): string {
  let tip = (descriptionFieldMapJson as Record<string, any>)[tab.name]?.[field];
  if (nestedField) {
    tip = (descriptionFieldMapJson as Record<string, any>)[tab.name]?.[field]?.[nestedField];
  }
  return tip || "";

}

function jumpToPreview(tab: JsonTab, field: any, nestedField?: any) {
  let location = (localFieldMapJson as Record<string, any>)[tab.name]?.[field];
  if (nestedField) {
    location = (localFieldMapJson as Record<string, any>)[tab.name]?.[field]?.[nestedField];
  }
  const [fileBackendId, pageNo] = location?.split('|') || [];
  previewFile(fileBackendId, { pageNo });
}

function openPreviewInNewTab() {
  if (currentPreviewUrl.value) {
    window.open(currentPreviewUrl.value, "_blank");
  }
}

function handleCategoryChange() {
  jsonTabs.value = [];
  uploadedFiles.value = uploadedFiles.value.filter(f => f.categoryId !== selectedCategory.value);
}

function getRequiredFiles(): FileType[] {
  const category = fileCategories.value.find((c) => c.value === selectedCategory.value);
  return category?.files || [];
}

function getUploadedFile(fileTypeBackendField: string): UploadedFile | undefined {
  return uploadedFiles.value.find(
    (f) => f.categoryId === selectedCategory.value && f.backendField === fileTypeBackendField
  );
}

function handleFileChange(file: UploadUserFile, fileType: FileType) {
  if (file.raw) {
    const { backendField, name: fileTypeId } = fileType

    const existingIndex = uploadedFiles.value.findIndex(
      (f) => f.categoryId === selectedCategory.value && f.fileTypeId === fileType.name
    );

    const previewUrl = createObjectURL(file.raw);

    if (existingIndex !== -1) {
      uploadedFiles.value[existingIndex] = {
        categoryId: selectedCategory.value,
        fileTypeId,
        file: file.raw,
        previewUrl,
        backendField,
      };
    } else {
      uploadedFiles.value.push({
        categoryId: selectedCategory.value,
        fileTypeId,
        file: file.raw,
        previewUrl,
        backendField,
      });
    }
  }
}

function handleFileRemove(fileTypeId: string) {
  const index = uploadedFiles.value.findIndex(
    (f) => f.categoryId === selectedCategory.value && f.fileTypeId === fileTypeId
  );
  if (index !== -1) {
    uploadedFiles.value.splice(index, 1);
  }
}

function createObjectURL(file: File): string {
  return URL.createObjectURL(file);
}

function previewFile(fileTypeBackendField: string, otherParams?: PreviewFileParams) {
  const uploadedFile = getUploadedFile(fileTypeBackendField);
  if (!uploadedFile || !uploadedFile.file) return;

  const file = uploadedFile.file;
  currentPreviewFile.value = file;

  if (file.type.includes("pdf")) {
    currentPreviewType.value = "pdf";
    if (otherParams && otherParams.pageNo) {
      // If page number is provided, append it to the URL
      currentPreviewUrl.value = `${uploadedFile.previewUrl}#page=${otherParams.pageNo}`;
    } else {
      currentPreviewUrl.value = uploadedFile.previewUrl || "";
    }
  } else if (file.type.includes("image")) {
    currentPreviewType.value = "image";
    currentPreviewUrl.value = uploadedFile.previewUrl || "";
  } else if (
    file.type.includes("powerpoint") ||
    file.name.endsWith(".ppt") ||
    file.name.endsWith(".pptx")
  ) {
    currentPreviewType.value = "powerpoint";
    // For PowerPoint, we use the Microsoft Office Viewer
    currentPreviewUrl.value = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
      uploadedFile.previewUrl || ""
    )}`;
  } else {
    currentPreviewType.value = "other";
    currentPreviewUrl.value = "";
  }

  previewDialogVisible.value = true;
}


function downloadFile() {
  if (currentPreviewFile.value) {
    const url = URL.createObjectURL(currentPreviewFile.value);
    const link = document.createElement("a");
    link.href = url;
    link.download = currentPreviewFile.value.name;
    link.click();
    URL.revokeObjectURL(url);
  }
}

// Functions to handle dynamic JSON data
function processJsonData(jsonData: Record<string, any>) {
  // Clear existing tabs
  jsonTabs.value = [];

  // Process each section of the JSON
  for (const key in jsonData) {
    if (Object.prototype.hasOwnProperty.call(jsonData, key)) {
      const data = jsonData[key];
      const isArray = Array.isArray(data);

      jsonTabs.value.push({
        name: key,
        type: isArray ? 'array' : 'object',
        data: data
      });
    }
  }

  // Set active tab to the first one if available
  if (jsonTabs.value.length > 0) {
    activeTab.value = "0";
  }
}

// Function to get headers for a nested table
function getNestedTableHeaders(dataArray: any[]): string[] {
  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    return [];
  }

  // Get all unique keys from all objects in the array
  const headers = new Set<string>();

  dataArray.forEach(item => {
    if (typeof item === 'object' && item !== null) {
      Object.keys(item).forEach(key => headers.add(key));
    }
  });

  return Array.from(headers);
}

// Function to convert array of objects to table data format for el-table
function convertArrayToTableData(dataArray: any[]): any[] {
  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    return [];
  }

  return dataArray.map(item => {
    // If item is not an object, convert it to an object with a 'value' property
    if (typeof item !== 'object' || item === null) {
      return { value: item };
    }
    return { ...item };
  });
}

// Export nested table as Excel/CSV
function exportNestedTable(dataArray: any[], tableName: string | number, type: 'Excel' | 'CSV' = 'Excel') {
  // const headers = getNestedTableHeaders(dataArray);
  const worksheet = XLSX.utils.json_to_sheet(dataArray);

  if (type === 'CSV') {
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const data = new Blob([csvOutput], { type: "text/csv;charset=utf-8" });
    FileSaver.saveAs(data, `${tableName}-${new Date().getTime()}.csv`);
  } else {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${tableName}`);
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    FileSaver.saveAs(data, `${tableName}-${new Date().getTime()}.xlsx`);
  }
}

async function generateValue() {
  try {
    isGenerating.value = true;
    const formData = new FormData();

    // Add all files for the current category
    uploadedFiles.value.forEach((file) => {
      if (file.categoryId === selectedCategory.value) {
        formData.append(file.backendField, file.file);
      }
    });

    const response = await axios.post(
      'https://poc-jsc-contract-api-hrbtg6fnc0dabhc5.eastus-01.azurewebsites.net/api/process-contract',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: 'Bearer d_and_b_jsc_contract_key'
        }
      })


    if (response.data) {
      processJsonData(response.data);
      ElNotification({
        title: 'Success',
        type: 'success',
        message: 'Data generated successfully',
      })
    }
  } catch (error) {
    console.error("Error generating values:", error);
    ElNotification({
      type: 'error',
      title: 'Error',
      message: "Failed to generate data",
    })
  } finally {
    isGenerating.value = false;
    processJsonData(fileUploadJson);
  }
}

// Add edit handling functions
function handleEdit(data: any, key: any, type: 'table' | 'description' = 'table') {
  editingContext.value = { data, key, type };
  editingValue.value = data[key];
  editDialogVisible.value = true;
}

function handleEditSave() {
  if (editingContext.value) {
    const { data, key } = editingContext.value;
    data[key] = editingValue.value;
    editDialogVisible.value = false;
    editingContext.value = null;

    ElNotification({
      title: 'Success',
      type: 'success',
      message: 'Field updated successfully',
    });
  }
}

</script>

<style lang="less" scoped>
.dialog-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 16px;
}

:deep(.el-dialog.is-fullscreen) {
  display: flex !important;
  flex-direction: column !important;
}

:deep(.el-dialog__body) {
  flex: 1;
}


:deep(.el-dialog__header) {
  background-color: #fff;
}

:deep(.el-dialog__header) h4 {
  color: #303133;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 20px;
}

.header-section {
  padding: 20px;
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  margin-bottom: 20px;

  h2 {
    margin-bottom: 20px;
    color: #409EFF;
  }
}

.main-content {
  display: flex;
  flex: 1;
  gap: 20px;
  min-height: 0; // Important for nested scrolling
}

.left-panel {
  flex: 0 0 400px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 20px;
  overflow-y: auto;
}

.right-panel {
  flex: 1;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 20px;
  overflow-y: auto;
}

.upload-section {
  h3 {
    margin-bottom: 20px;
    color: #303133;
  }
}

.file-upload-item {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #e6e6e6;
  border-radius: 4px;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  }
}

.file-type-name {
  margin-bottom: 10px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  color: #303133;
  justify-content: center;
}

.uploaded-file {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #606266;
  justify-content: center;
}

.uploaded-file-text {
  max-width: 200px;
}

.action-buttons {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  padding: 20px;
  background-color: #fff;
  border-top: 1px solid #e6e6e6;
}

.results-section {
  .table-actions {
    margin-bottom: 15px;
    display: flex;
    gap: 10px;
  }
}

.preview-container {
  min-height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  min-height: 600px;
  height: 100%;

  iframe {
    flex: 1;
  }

  .preview-not-available {
    text-align: center;
    padding: 20px;
    color: #909399;

    p {
      margin-bottom: 15px;
    }
  }
}

.field-item {
  cursor: pointer;
}

/* Styles for tabs and dynamic content */
.tab-content-object,
.tab-content-array {
  padding: 15px;
  overflow: scroll;

  h4 {
    margin-top: 20px;
    margin-bottom: 10px;
    color: #606266;
    font-weight: bold;
    font-size: 16px;
  }
}

.nested-table-container,
.nested-object-container {
  margin-top: 20px;
  margin-bottom: 25px;
  border-radius: 4px;
  background-color: #FFF;

  h4 {
    display: flex;
    margin-right: 15px;
    margin-top: 0;
    margin-bottom: 15px;
    color: #303133;
    font-size: 16px;
    font-weight: bold;
  }
}

:deep(.el-descriptions) {
  margin-bottom: 20px;

  .el-descriptions__title {
    font-size: 18px;
    font-weight: bold;
    color: #303133;
  }

  .el-descriptions__label {
    font-weight: bold;
    color: #606266;
  }
}

:deep(.custom-table-header) {
  background-color: #f5f7fa;
  color: #606266;
  font-weight: bold;
}

:deep(.el-table) {
  margin-bottom: 15px;
  border-radius: 4px;
  overflow: hidden;
}

:deep(.el-table) {
  margin-bottom: 15px;
  border-radius: 4px;
  overflow: hidden;
}

:deep(.el-table th) {
  background-color: #f5f7fa !important;
}

:deep(.el-upload-list__item-name) {
  display: flex;
  justify-content: center;
}

.field-with-edit {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.truncated-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.edit-icon {
  cursor: pointer;
  color: #409EFF;
  flex-shrink: 0;

  &:hover {
    color: #66b1ff;
  }
}

:deep(.el-descriptions__cell) {
  .field-with-edit {
    width: 100%;
  }
}

:deep(.el-table__cell) {
  .field-with-edit {
    width: 100%;
  }
}

.header-with-icon {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.question-icon {
  color: #909399;
  cursor: help;
  flex-shrink: 0;

  &:hover {
    color: #409EFF;
  }
}

:deep(.el-descriptions__label) {
  .header-with-icon {
    width: 100%;
  }
}

:deep(.el-table__header) {
  .header-with-icon {
    width: 100%;
  }
}
</style>
