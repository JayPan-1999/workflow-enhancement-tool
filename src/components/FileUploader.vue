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

    <div v-if="tableData.length > 0" class="results-section mt-xl">
      <div class="table-actions flex mb-md">
        <el-button @click="exportToCSVOrExcel('Excel')">Export as Excel</el-button>
        <el-button @click="exportToCSVOrExcel('CSV')">Export as CSV</el-button>
      </div>

      <el-table ref="multipleTableRef" :data="tableData" style="width: 100%">
        <el-table-column type="selection" width="55"></el-table-column>
        <el-table-column prop="category" label="Category" />
        <el-table-column prop="fileName" label="File Name" />

        <el-table-column v-for="field in tableFields" :key="field" :label="field" align="center">
          <template #default="scope">
            <template v-if="getField(scope.row, field)">
              <el-input v-if="getField(scope.row, field)?.editable" v-model="(getField(scope.row, field) as any).value"
                size="small" />
              <span v-else>{{ getField(scope.row, field)?.value }}</span>
            </template>
          </template>
        </el-table-column>
      </el-table>
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
import { ElMessage, ElMessageBox } from "element-plus";
import type { TableInstance, UploadUserFile } from "element-plus";
import * as XLSX from "xlsx";
import FileSaver from "file-saver";
import type {
  FileCategory,
  FileType,
  UploadedFile,
  TableData,
  TableField,
  ApiResponse,
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
const tableData = ref<TableData[]>([]);
const tableFields = ref<string[]>([]);
const previewDialogVisible = ref(false);
const currentPreviewUrl = ref("");
const currentPreviewType = ref("");
const currentPreviewFile = ref<File | null>(null);
const notificationVisible = ref(false);
const notificationTitle = ref("");
const notificationMessage = ref("");
const notificationType = ref<"success" | "warning" | "info" | "error">("info");
const commentAdJustField = ref("")
// table ref
const multipleTableRef = ref<TableInstance>()

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
  tableData.value = [];
  tableFields.value = [];
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

function getField(row: TableData, fieldName: string): TableField | undefined {
  return row.fields.find((field) => field.fieldName === fieldName);
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

// Mock API calls
function mockGenerateAPI(): Promise<ApiResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Define fields based on category
      let fields: string[];

      if (selectedCategory.value === "New Letting (Office)") {
        fields = ["Amount", "Date", "Currency", "Vendor", "Tax", "Total"];
      } else if (selectedCategory.value === "hr") {
        fields = [
          "Employee ID",
          "Department",
          "Position",
          "Start Date",
          "Salary",
          "Status",
        ];
      } else if (selectedCategory.value === "marketing") {
        fields = [
          "Campaign ID",
          "Target Audience",
          "Budget",
          "Start Date",
          "End Date",
          "Channel",
        ];
      } else {
        // No type or default
        fields = ["Field 1", "Field 2", "Field 3", "Notes"];
      }

      tableFields.value = fields;

      const data: TableData[] = [];

      if (selectedCategory.value === "no-type") {
        // For free upload type
        anyTypeFiles.value.forEach((file, index) => {
          const rowFields: TableField[] = fields.map((field) => ({
            fieldName: field,
            value: getDefaultValueForField(field),
            editable: true,
          }));

          data.push({
            id: `any-${index}`,
            category: "User Defined",
            fileName: file.name,
            fields: rowFields,
          });
        });
      } else {
        // For specific category uploads
        uploadedFiles.value
          .filter((file) => file.categoryId === selectedCategory.value)
          .forEach((uploadedFile, index) => {
            const rowFields: TableField[] = fields.map((field) => ({
              fieldName: field,
              value: getDefaultValueForField(field),
              // editable: Math.random() > 0.3, // 70% of fields are editable  
              editable: true
            }));

            data.push({
              id: `cat-${index}`,
              category:
                fileCategories.value.find((c) => c.value === selectedCategory.value)
                  ?.label || "",
              fileName: uploadedFile.file.name,
              fields: rowFields,
            });
          });
      }

      resolve({
        success: true,
        data,
        fields,
      });
    }, 1000);
  });
}

function getDefaultValueForField(fieldName: string): string | number {
  // Generate realistic default values based on field name
  if (
    fieldName.toLowerCase().includes("amount") ||
    fieldName.toLowerCase().includes("budget") ||
    fieldName.toLowerCase().includes("salary") ||
    fieldName.toLowerCase().includes("tax") ||
    fieldName.toLowerCase().includes("total")
  ) {
    return Math.floor(Math.random() * 10000) / 100;
  }

  if (fieldName.toLowerCase().includes("date")) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 365));
    return date.toISOString().split("T")[0];
  }

  if (fieldName.toLowerCase().includes("id")) {
    return `ID-${Math.floor(Math.random() * 10000)}`;
  }

  if (fieldName.toLowerCase().includes("status")) {
    const statuses = ["Active", "Pending", "Completed", "On Hold"];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  if (fieldName.toLowerCase().includes("currency")) {
    const currencies = ["USD", "EUR", "GBP", "JPY", "CNY"];
    return currencies[Math.floor(Math.random() * currencies.length)];
  }

  // Default for other fields
  return fieldName.includes("Field") ? "" : "Click to edit";
}

function mockSubmitAPI(data: TableData[]): Promise<ApiResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: "Data successfully processed!",
      });
    }, 1000);
  });
}

async function generateValue() {
  try {
    const response = await mockGenerateAPI();
    if (response.success && response.data) {
      tableData.value = response.data;
      showNotification("Success", "success", "Table data generated successfully");
    }
  } catch (error) {
    console.error("Error generating values:", error);
    showNotification("Error", "error", "Failed to generate table data");
  }
}

async function submitData() {
  if (multipleTableRef.value) {
    console.log(multipleTableRef.value.getSelectionRows());
  }
  try {
    // Check if all editable fields have values
    let hasEmptyEditableFields = false;
    tableData.value.forEach((row) => {
      row.fields.forEach((field) => {
        if (
          field.editable &&
          (field.value === "" || field.value === null || field.value === undefined)
        ) {
          hasEmptyEditableFields = true;
        }
      });
    });

    if (hasEmptyEditableFields) {
      ElMessageBox.alert(
        "Please fill in all editable fields before submitting.",
        "Validation Error",
        { type: "warning" }
      );
      return;
    }

    const response = await mockSubmitAPI(tableData.value);
    if (response.success) {
      showNotification(
        "Success",
        "success",
        response.message || "The table data is updated"
      );
      generateValue()
      // Reset form after successful submission
      // resetForm();
    }
  } catch (error) {
    console.error("Error submitting data:", error);
    showNotification("Error", "error", "Failed to submit data");
  }
}

// function resetForm() {
//   selectedCategory.value = "";
//   uploadedFiles.value = [];
//   anyTypeFiles.value = [];
//   tableData.value = [];
//   tableFields.value = [];
//   fileUploadRefs.value = [];
// }

function exportToCSVOrExcel(type: 'CSV' | 'Excel') {
  // Convert tableData to a format suitable for export
  const exportData = tableData.value.map((row) => {
    const exportRow: Record<string, any> = {
      Category: row.category,
      FileName: row.fileName,
    };

    row.fields.forEach((field) => {
      exportRow[field.fieldName] = field.value;
    });

    return exportRow;
  });
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  if (type === 'CSV') {
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const data = new Blob([csvOutput], { type: "text/csv;charset=utf-8" });
    FileSaver.saveAs(data, `exported-data-${new Date().getTime()}.csv`);
  }
  if (type === 'Excel') {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    FileSaver.saveAs(data, `exported-data-${new Date().getTime()}.xlsx`);
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
  background-color: @background-light;
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
}

.uploaded-file {
  margin-top: @spacing-sm;
  display: flex;
  align-items: center;
  gap: @spacing-sm;
  color: @text-color-secondary;
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

  .comment-title {
    margin: 15px 0 15px 0;
  }

  .comment-submit {
    margin: 15px 0 15px 0;
    float: right;
  }
}
</style>
