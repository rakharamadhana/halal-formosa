<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Write News Article</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">

      <!-- Title -->
      <ion-item>
        <ion-input
            v-model="title"
            label="Article Title"
            label-placement="stacked"
            placeholder="Enter news title"
            required
        />
      </ion-item>

      <!-- Header Image Upload -->
      <div class="upload-section">
        <label class="upload-label">Header Image</label>
        <input type="file" accept="image/*" @change="handleHeaderImage" />
        <div v-if="headerPreview" class="image-preview">
          <img :src="headerPreview" alt="Header Preview" />
        </div>
      </div>

      <!-- Rich Text Editor -->
      <div class="editor-section">
        <label class="upload-label">Content</label>
        <QuillEditor
            v-model="content"
            theme="snow"
            :modules="editorModules"
            placeholder="Write your article..."
        />
      </div>

      <!-- Actions -->
      <ion-button expand="block" color="carrot" class="ion-margin-top" @click="submitArticle" :disabled="loading">
        {{ loading ? 'Publishing...' : 'Publish Article' }}
      </ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonInput, IonButton } from '@ionic/vue';
import { supabase } from '@/plugins/supabaseClient';
import { Quill } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';

const title = ref('');
const content = ref('');
const headerFile = ref<File | null>(null);
const headerPreview = ref<string | null>(null);
const loading = ref(false);

const editorModules: Quill['modules'] = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'image'],
    ['clean'],
  ],
};

function handleHeaderImage(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0] || null;
  if (file) {
    headerFile.value = file;
    headerPreview.value = URL.createObjectURL(file);
  }
}

async function submitArticle() {
  if (!title.value || !content.value) {
    alert('Title and content are required');
    return;
  }

  loading.value = true;

  let headerUrl = null;
  if (headerFile.value) {
    const filePath = `news/${Date.now()}-${headerFile.value.name}`;
    const { error } = await supabase.storage.from('news-images').upload(filePath, headerFile.value);
    if (error) {
      console.error('Image upload failed:', error.message);
    } else {
      const { data: urlData } = supabase.storage.from('news-images').getPublicUrl(filePath);
      headerUrl = urlData.publicUrl;
    }
  }

  const { error } = await supabase.from('news').insert({
    title: title.value,
    content: content.value,
    header_image: headerUrl,
    created_at: new Date(),
  });

  loading.value = false;

  if (error) {
    alert('Error publishing article: ' + error.message);
  } else {
    alert('Article published successfully!');
    title.value = '';
    content.value = '';
    headerFile.value = null;
    headerPreview.value = null;
  }
}
</script>

<style scoped>
.upload-section {
  margin-top: 1rem;
}

.upload-label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.image-preview {
  margin-top: 0.5rem;
  max-width: 100%;
}

.image-preview img {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.editor-section {
  margin-top: 1rem;
}

.rich-editor {
  min-height: 200px;
  background: #fff;
  border-radius: 8px;
  padding: 0.5rem;
}
</style>
