<template>
  <div class="file-uploader-container">
    <h2 class="text-center mb-lg">HKLand Lease Document Management</h2>
    <el-form label-position="top">
      <el-form-item label="Select Document Category">
        <el-select v-model="selectedCategory" placeholder="Select category" @change="handleCategoryChange">
          <el-option v-for="category in fileCategories" :key="category.value" :label="category.label"
            :value="category.value" />
        </el-select>
      </el-form-item>
    </el-form>

    <div v-if="selectedCategory" class="upload-section">
      <h3 class="mb-md">Upload Required Files</h3>
      <div v-if="selectedCategory === 'no-type'" class="free-upload">
        <el-upload v-model:file-list="anyTypeFiles" multiple action="#" :limit="5" :auto-upload="false"
          :on-change="handleAnyFileChange" :on-exceed="handleExceed" :before-upload="beforeAnyUpload">
          <el-button type="primary">Select Files (Max 5)</el-button>
          <template #tip>
            <div class="el-upload__tip">You can upload up to 5 files of any type</div>
          </template>
        </el-upload>

        <!-- Preview for no-type files -->
        <div v-if="anyTypeFiles.length > 0" class="any-type-files-list mt-md">
          <h4>Uploaded Files:</h4>
          <div v-for="(file, index) in anyTypeFiles" :key="index" class="any-type-file-item">
            <el-tag type="success">{{ file.name }}</el-tag>
            <el-button type="text" @click="previewAnyTypeFile(file)">Preview</el-button>
          </div>
        </div>
      </div>

      <div v-else class="required-files">
        <div v-for="fileType in getRequiredFiles()" :key="fileType.name" class="file-upload-item">
          <div class="file-type-name">
            {{ fileType.name }}
            <el-tag v-if="fileType.required" type="danger" size="small">Required</el-tag>
          </div>
          <el-upload :ref="setFileUploadRef" action="#" :auto-upload="false" :limit="1" :accept="fileType.fileType"
            :on-change="(file: any) => handleFileChange(file, fileType.name)"
            :on-remove="() => handleFileRemove(fileType.name)">
            <el-button type="primary">Upload {{ fileType.name }}</el-button>
          </el-upload>
          <div v-if="getUploadedFile(fileType.name)" class="uploaded-file mt-sm">
            <el-tag type="success">Uploaded: {{ getUploadedFile(fileType.name)?.file.name }}</el-tag>
            <el-button type="text" @click="previewFile(fileType.name)">Preview</el-button>
          </div>
        </div>
      </div>
    </div>

    <div class="action-buttons flex-center mt-lg" v-if="selectedCategory && hasUploadedFiles">
      <el-button type="primary" @click="generateValue" :disabled="!canGenerate">Generate Value</el-button>
    </div>

    <!-- New Dynamic JSON Result Section -->
    <div v-if="jsonTabs.length > 0" class="results-section mt-xl">
      <el-tabs v-model="activeTab" type="border-card">
        <el-tab-pane v-for="(tab, index) in jsonTabs" :key="tab.name" :label="tab.name" :name="String(index)">

          <!-- Object data shown as Description list -->
          <div v-if="tab.type === 'object'" class="tab-content-object">
            <!-- Display primitive fields as descriptions -->
            <el-descriptions :title="tab.name" :column="2" border>
              <template v-for="(value, key) in tab.data" :key="key">
                <!-- Only display primitive values in descriptions -->
                <el-descriptions-item v-if="typeof value !== 'object' || value === null" :label="key">
                  {{ value }}
                </el-descriptions-item>
              </template>
            </el-descriptions>

            <!-- Display array data as separate tables -->
            <div v-for="(value, key) in tab.data" :key="`table-${key}`">
              <div v-if="Array.isArray(value)" class="nested-table-container">
                <h4>{{ key }}</h4>
                <div class="table-actions">
                  <el-button @click="exportNestedTable(value, key)" size="small" type="primary">Export as
                    Excel</el-button>
                  <el-button @click="exportNestedTable(value, key, 'CSV')" size="small" type="primary">Export as
                    CSV</el-button>
                </div>
                <el-table :data="convertArrayToTableData(value)" style="width: 100%">
                  <el-table-column v-for="header in getNestedTableHeaders(value)" :key="header" :prop="header"
                    :label="header" header-class-name="custom-table-header" />
                </el-table>
              </div>
            </div>

            <!-- Display nested objects as separate descriptions -->
            <div v-for="(value, key) in tab.data" :key="`obj-${key}`">
              <div v-if="typeof value === 'object' && !Array.isArray(value) && value !== null"
                class="nested-object-container">
                <h4>{{ key }}</h4>
                <el-descriptions :column="1" border size="small">
                  <el-descriptions-item v-for="(nestedValue, nestedKey) in value" :key="nestedKey" :label="nestedKey">
                    {{ nestedValue }}
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </div>
          </div>

          <!-- Array data shown as Table -->
          <div v-else-if="tab.type === 'array'" class="tab-content-array">
            <div class="table-actions">
              <el-button @click="exportNestedTable(tab.data, tab.name)" size="small" type="primary">Export as
                Excel</el-button>
              <el-button @click="exportNestedTable(tab.data, tab.name, 'CSV')" size="small" type="primary">Export as
                CSV</el-button>
            </div>
            <el-table :data="convertArrayToTableData(tab.data)" style="width: 100%">
              <el-table-column v-for="header in getNestedTableHeaders(tab.data)" :key="header" :prop="header"
                :label="header" header-class-name="custom-table-header" />
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>

      <div class="comment-container">
        <div class="comment-title">Value Adjustment Query</div>
        <el-input v-model="commentAdJustField"></el-input>
        <el-button class="comment-submit" type="success" @click="submitData">Submit Query</el-button>
      </div>
    </div>

    <!-- Preview dialog -->
    <el-dialog v-model="previewDialogVisible" title="File Preview" width="80%">
      <div class="preview-container">
        <iframe v-if="currentPreviewType === 'pdf'" :src="currentPreviewUrl" width="100%" height="600"></iframe>
        <img v-else-if="currentPreviewType === 'image'" :src="currentPreviewUrl" style="max-width: 100%" />
        <iframe v-else-if="currentPreviewType === 'powerpoint'" :src="currentPreviewUrl" width="100%"
          height="600"></iframe>
        <div v-else class="preview-not-available">
          <p>Preview not available for this file type.</p>
          <el-button type="primary" @click="downloadFile">Download File</el-button>
        </div>
      </div>
    </el-dialog>

    <!-- Notification feedback -->
    <el-notification v-model:visible="notificationVisible" :title="notificationTitle" :type="notificationType"
      :message="notificationMessage" :duration="3000" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { ElMessage } from "element-plus";
import type { UploadUserFile } from "element-plus";
import * as XLSX from "xlsx";
import FileSaver from "file-saver";
import type {
  FileCategory,
  FileType,
  UploadedFile,
  ApiResponse,
  JsonTab,
} from "../types";

// Define file categories
const fileCategories = ref<FileCategory[]>([
  {
    label: "New Letting (Office)",
    value: "New Letting (Office)",
    files: [
      { name: "Signed Lease", required: true, fileType: ".pdf" },
      { name: "Side Letter", required: false, fileType: ".pdf" },
      { name: "MC PC Summary", required: true, fileType: ".xlsx,.xls" },
      { name: "Deposit Fact Sheet", required: true, fileType: ".pdf" },
      { name: "Contact Info E-mail", required: false, fileType: ".xlsx" },
    ],
  },
  // {
  //   label: "HR",
  //   value: "hr",
  //   files: [
  //     { name: "Resume", required: true, fileType: ".pdf" },
  //     { name: "ID Card", required: true, fileType: ".jpg,.jpeg,.png" },
  //     { name: "Contract", required: false, fileType: ".pdf" },
  //   ],
  // },
  // {
  //   label: "Marketing",
  //   value: "marketing",
  //   files: [
  //     { name: "Presentation", required: true, fileType: ".pptx,.ppt" },
  //     { name: "Campaign Images", required: true, fileType: ".jpg,.jpeg,.png" },
  //   ],
  // },
  // {
  //   label: "No Type (Free Upload)",
  //   value: "no-type",
  //   files: [],
  // },
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
const notificationVisible = ref(false);
const notificationTitle = ref("");
const notificationMessage = ref("");
const notificationType = ref<"success" | "warning" | "info" | "error">("info");
const commentAdJustField = ref("");

// New refs for dynamic JSON data
const jsonTabs = ref<JsonTab[]>([]);
const activeTab = ref("0");

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

// Methods
function setFileUploadRef(el: any) {
  if (el) {
    fileUploadRefs.value.push(el);
  }
}

function handleCategoryChange() {
  jsonTabs.value = [];
}

function getRequiredFiles(): FileType[] {
  const category = fileCategories.value.find((c) => c.value === selectedCategory.value);
  return category?.files || [];
}

function getUploadedFile(fileTypeId: string): UploadedFile | undefined {
  return uploadedFiles.value.find(
    (f) => f.categoryId === selectedCategory.value && f.fileTypeId === fileTypeId
  );
}


function handleFileChange(file: UploadUserFile, fileTypeId: string) {
  if (file.raw) {
    const existingIndex = uploadedFiles.value.findIndex(
      (f) => f.categoryId === selectedCategory.value && f.fileTypeId === fileTypeId
    );

    const previewUrl = createObjectURL(file.raw);

    if (existingIndex !== -1) {
      uploadedFiles.value[existingIndex] = {
        categoryId: selectedCategory.value,
        fileTypeId,
        file: file.raw,
        previewUrl,
      };
    } else {
      uploadedFiles.value.push({
        categoryId: selectedCategory.value,
        fileTypeId,
        file: file.raw,
        previewUrl,
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

function handleAnyFileChange(file: UploadUserFile) {
  if (file.raw) {
    // We're storing these separately from uploadedFiles to handle the "no-type" case differently
    const fileExists = anyTypeFiles.value.some((f) => f.name === file.name);
    if (!fileExists) {
      // anyTypeFiles is automatically updated by el-upload's v-model
      // Add the preview URL to the file object
      file.url = createObjectURL(file.raw);
    }
  }
}

function beforeAnyUpload(file: File) {
  // We're not actually uploading, just collecting the files
  return false;
}

function handleExceed() {
  ElMessage.warning("You can only upload a maximum of 5 files");
}

function createObjectURL(file: File): string {
  return URL.createObjectURL(file);
}

function previewFile(fileTypeId: string) {
  const uploadedFile = getUploadedFile(fileTypeId);
  if (!uploadedFile || !uploadedFile.file) return;

  const file = uploadedFile.file;
  currentPreviewFile.value = file;

  if (file.type.includes("pdf")) {
    currentPreviewType.value = "pdf";
    currentPreviewUrl.value = uploadedFile.previewUrl || "";
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

function previewAnyTypeFile(file: UploadUserFile) {
  if (!file.raw) return;

  currentPreviewFile.value = file.raw;

  if (file.raw.type.includes("pdf")) {
    currentPreviewType.value = "pdf";
    currentPreviewUrl.value = file.url || "";
  } else if (file.raw.type.includes("image")) {
    currentPreviewType.value = "image";
    currentPreviewUrl.value = file.url || "";
  } else if (
    file.raw.type.includes("powerpoint") ||
    file.name.endsWith(".ppt") ||
    file.name.endsWith(".pptx")
  ) {
    currentPreviewType.value = "powerpoint";
    // For PowerPoint, we use the Office Live Viewer
    currentPreviewUrl.value = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
      file.url || ""
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

// Mock API calls with the new JSON structure
function mockGenerateAPI(): Promise<ApiResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Use the sample JSON data from test.json
      const sampleJsonData = {
        "Tenant Basic": {
          "Name Line 1": "NEXT GENERATION MARINE ENGINEERING",
          "Name Line 2": "LIMITED",
          "Nationality": "Chinese",
          "Debit Note E-mail": "louisa@ewpartners.fund;lyn@ewpartners.fund",
          "Debit Note Print Flag": "E - Email Only",
          "Effective Date": "27 Dec 2024",
          "Mailing Name (Line 1)": "NEXT GENERATION MARINE ENGINEERING",
          "Mailing Name (Line 2)": "LIMITED",
          "Address 1": "Room 1903, 19/F",
          "Address 2": "Lee Garden One",
          "Address 3": "33 Hysan Avenue",
          "Address 4": "Causeway Bay, Hong Kong",
          "Phone No.": "+86 13811612788",
          "Alt Phone No.": "+86 13521201755",
          "Contact Person": [
            {
              "Name (Line 1)": "Liv Chi",
              "Title (Line 1)": "Senior VP of HR and Admin",
              "Phone No.": "+86 13811612788",
              "Alt Phone No.": "+86 13521201755",
              "Email": "liv@ewpartners.fund",
              "Type": "Leasing"
            },
            {
              "Name (Line 1)": "Lyn Guan",
              "Title (Line 1)": "Senior Associate (Finance Department)",
              "Phone No.": "+86 13521201755",
              "Alt Phone No.": "+86 13811612788",
              "Email": "lyn@ewpartners.fund",
              "Type": "Billing"
            }
          ]
        },
        "Tenancy Particular": {
          "Tenant": "NEXT GENERATION MARINE ENGINEERING LIMITED",
          "LMS Trading Name": "Next Generation Marine Engineering Limited",
          "Building": "JARDINE HOUSE",
          "Premises": "Suite 3911",
          "Term": "36 months",
          "LMS Business Nature": "Asset / Investment Management",
          "Lease Start": "01 Mar 2025",
          "Lease End": "29 Feb 2028",
          "R/F Period": "3 months",
          "R/F Remarks": "01/03/2025-31/03/2025 & 01/01/2028-29/02/2028",
          "R/R Date (1st)": "",
          "R/R Date (2st)": "",
          "R/R Date (3st)": "",
          "R/R Date (4st)": "",
          "R/R Date (5st)": "",
          "R/R Date (6st)": "",
          "R/R Remark": "",
          "Surrender Date": "",
          "License": "",
          "Lease Type": "Office",
          "Local Currency": "True",
          "DSP Notice": "",
          "Prepare Auto Pay Form": "True",
          "Remark": "Stls.6.1.006F.Off.08 doc 01.05.2022",
          "Lease Units": [
            {
              "Unit": "3911",
              "Move In": "01 Mar 2025",
              "Move Out": "29 Feb 2028",
              "Lettable Area": "1,114",
              "Rateable Value": "1,404,000",
              "JDE Business Nature": "Asset / Investment Management",
              "JDE Tradename": "Next Generation Marine Engineering Limited"
            }
          ]
        },
        "Recurring Billing": [
          {
            "Unit": "3911",
            "Start Date": "01 Mar 2025",
            "End Date": "31 Mar 2025",
            "Rent (psf)": "Free",
            "MC (psf)": "15.50psf",
            "PC": "",
            "Rates (psf)": "5.25psf",
            "Remarks": "Rent Free Period, MC from MC PC SUMMARY Year 2025 (Jan - June)"
          },
          {
            "Unit": "3911",
            "Start Date": "01 Apr 2025",
            "End Date": "30 Jun 2025",
            "Rent (psf)": "120.00psf",
            "MC (psf)": "15.50psf",
            "PC": "",
            "Rates (psf)": "5.25psf",
            "Remarks": "MC from MC PC SUMMARY Year 2025 (Jan - June)"
          },
          {
            "Unit": "3911",
            "Start Date": "01 Jul 2025",
            "End Date": "31 Dec 2027",
            "Rent (psf)": "120.00psf",
            "MC (psf)": "15.90psf",
            "PC": "",
            "Rates (psf)": "5.25psf",
            "Remarks": "MC from MC PC SUMMARY Year 2025 (July - Dec)"
          },
          {
            "Unit": "3911",
            "Start Date": "01 Jan 2028",
            "End Date": "29 Feb 2028",
            "Rent (psf)": "Free",
            "MC (psf)": "15.90psf",
            "PC": "",
            "Rates (psf)": "5.25psf",
            "Remarks": "Rent Free Period, MC from MC PC SUMMARY Year 2025 (July - Dec)"
          }
        ],
        "Turnover Rent": {},
        "Security Deposit": {
          "Cash Deposit": "HKD 628,747.60",
          "No of Months": "4.00",
          "Type of Guarantee": "Personal guarantee (Fung Kwok Chor, Alfred)",
          "Reamrks": "4 months cash deposit"
        },
        "Lease Incentives": [
          {
            "Building Name": "JARDINE HOUSE",
            "Display Unit Description": "Suite 3911",
            "Rent Free Period": "01 Mar 2025 - 31 Mar 2025",
            "Monthly Amount": "$133,680.00",
            "Total Amount": "$133,680.00",
            "Amortization Period": "01 Mar 2025 - 29 Feb 2028",
            "Remark": "1 month rent free",
            "Last Updated": "30 Apr 2025"
          },
          {
            "Building Name": "JARDINE HOUSE",
            "Display Unit Description": "Suite 3911",
            "Rent Free Period": "01 Jan 2028 - 29 Feb 2028",
            "Monthly Amount": "$133,680.00",
            "Total Amount": "$267,360.00",
            "Amortization Period": "01 Mar 2025 - 29 Feb 2028",
            "Remark": "2 months rent free",
            "Last Updated": "30 Apr 2025"
          }
        ]
      };

      resolve({
        success: true,
        jsonData: sampleJsonData
      });
    }, 1000);
  });
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
    const response = await mockGenerateAPI();
    if (response.success) {
      if (response.jsonData) {
        // Process the JSON data for the new UI
        processJsonData(response.jsonData);
        showNotification("Success", "success", "Data generated successfully");
      } else if (response.data) {
        // Backward compatibility with the old UI
        showNotification("Success", "success", "Table data generated successfully");
      }
    }
  } catch (error) {
    console.error("Error generating values:", error);
    showNotification("Error", "error", "Failed to generate data");
  }
}

async function submitData() {
  try {
    // For now, just regenerate the data with the query
    showNotification("Query Submitted", "success", "Processing your adjustment query");
    // Wait a moment to simulate processing
    setTimeout(() => {
      generateValue();
    }, 1500);
  } catch (error) {
    console.error("Error submitting data:", error);
    showNotification("Error", "error", "Failed to submit data");
  }
}

function showNotification(
  title: string,
  type: "success" | "warning" | "info" | "error",
  message: string
) {
  notificationTitle.value = title;
  notificationType.value = type;
  notificationMessage.value = message;
  notificationVisible.value = true;
}
</script>

<style lang="less" scoped>
.el-table :deep th {
  background-color: #f5f7fa !important;
}

:deep .el-upload-list__item-name {
  display: flex;
  justify-content: center;
}

:deep .el-descriptions__body {
  box-shadow: @box-shadow-light;
}

.file-uploader-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: @spacing-lg;

  h2 {
    margin-bottom: @spacing-lg;
    color: @primary-color;
  }
}

.upload-section {
  margin-top: @spacing-lg;
  padding: @spacing-lg;
  border: 1px solid @border-color;
  border-radius: @border-radius;
  box-shadow: @box-shadow-light;
  transition: all @transition-duration;

  &:hover {
    box-shadow: @box-shadow-base;
  }
}

.file-upload-item {
  margin-bottom: @spacing-lg;
  padding: @spacing-md;
  border-radius: @border-radius;
  border: 1px solid @border-color-light;
  transition: all @transition-duration;

  &:hover {
    transform: translateY(-2px);
    box-shadow: @box-shadow-light;
  }
}

.file-type-name {
  margin-bottom: @spacing-sm;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: @spacing-sm;
  font-size: @font-size-large;
  color: @text-color;
  display: flex;
  justify-content: center;
}

.uploaded-file {
  margin-top: @spacing-sm;
  display: flex;
  align-items: center;
  gap: @spacing-sm;
  color: @text-color-secondary;
  justify-content: center;
}

.any-type-files-list {
  margin-top: @spacing-md;
  padding: @spacing-md;
  background-color: @background-light;
  border-radius: @border-radius;
  border: 1px solid @border-color-light;

  h4 {
    margin-top: 0;
    margin-bottom: @spacing-sm;
    color: @text-color-secondary;
    font-size: @font-size-base;
  }

  .any-type-file-item {
    margin: @spacing-sm 0;
    display: flex;
    align-items: center;
    gap: @spacing-sm;
    padding: @spacing-xs;
    border-radius: @border-radius-small;

    &:hover {
      background-color: @border-color-light;
    }
  }
}

.action-buttons {
  margin-top: @spacing-lg;
  display: flex;
  justify-content: center;
}

.results-section {
  margin-top: @spacing-xl;

  .table-actions {
    margin-bottom: @spacing-md;
    display: flex;
    gap: @spacing-sm;
  }
}

.preview-container {
  min-height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;

  .preview-not-available {
    text-align: center;
    padding: @spacing-lg;
    color: @text-color-light;

    p {
      margin-bottom: @spacing-md;
    }
  }
}

.comment-container {
  text-align: left;
  margin-top: 20px;
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 4px;
  border: 1px solid #e6e6e6;

  .comment-title {
    margin: 15px 0 15px 0;
    font-weight: bold;
    color: #606266;
  }

  .comment-submit {
    margin: 15px 0 15px 0;
    float: right;
  }
}

/* New styles for tabs and dynamic content */
.tab-content-object,
.tab-content-array {
  padding: 15px;

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

.table-actions {
  margin-bottom: 15px;

  .el-button {
    margin-right: 10px;
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
</style>
