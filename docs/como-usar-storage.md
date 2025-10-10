# Guia: Como Usar o Supabase Storage

## 📦 Buckets Disponíveis

### 1. `avatars` (Público)
- **Uso**: Fotos de perfil de usuários
- **Acesso**: Público (URLs diretas)
- **Estrutura**: `{userId}/avatar.{ext}`

### 2. `attachments` (Privado)
- **Uso**: Anexos de posts e atividades
- **Acesso**: Apenas professores e secretaria
- **Estrutura**: `posts/{postId}/{fileName}`

### 3. `deliveries` (Privado)
- **Uso**: Entregas de alunos
- **Acesso**: Aluno (próprias entregas) e professores (entregas de suas turmas)
- **Estrutura**: `{studentId}/{deliveryId}/{fileName}`

---

## 💾 Upload de Arquivos

### Avatar (Foto de Perfil)

```typescript
import { supabase } from '@/integrations/supabase/client'

async function uploadAvatar(userId: string, file: File) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/avatar.${fileExt}`

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true // Substitui se já existir
    })

  if (error) throw error

  // Obter URL pública
  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName)

  return urlData.publicUrl
}
```

### Anexo de Post/Atividade

```typescript
async function uploadPostAttachment(postId: string, file: File) {
  const fileName = `posts/${postId}/${Date.now()}-${file.name}`

  const { data, error } = await supabase.storage
    .from('attachments')
    .upload(fileName, file)

  if (error) throw error

  // Criar URL assinada (válida por 1 hora)
  const { data: urlData } = await supabase.storage
    .from('attachments')
    .createSignedUrl(fileName, 3600)

  return {
    name: file.name,
    url: urlData?.signedUrl,
    size: file.size,
    type: file.type
  }
}
```

### Entrega de Aluno

```typescript
async function uploadDeliveryFile(
  studentId: string, 
  deliveryId: string, 
  file: File
) {
  const fileName = `${studentId}/${deliveryId}/${file.name}`

  const { data, error } = await supabase.storage
    .from('deliveries')
    .upload(fileName, file)

  if (error) throw error

  return {
    name: file.name,
    path: fileName,
    size: file.size,
    type: file.type
  }
}
```

---

## 📥 Download de Arquivos

### Avatar (Público)

```typescript
function getAvatarUrl(userId: string) {
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(`${userId}/avatar.png`)

  return data.publicUrl
}
```

### Anexo Privado

```typescript
async function getAttachmentUrl(filePath: string) {
  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(filePath, 3600) // Válido por 1 hora

  if (error) throw error
  return data.signedUrl
}
```

### Download Direto

```typescript
async function downloadFile(bucket: string, filePath: string) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(filePath)

  if (error) throw error

  // Criar URL temporária para download
  const url = URL.createObjectURL(data)
  
  // Criar link de download
  const a = document.createElement('a')
  a.href = url
  a.download = filePath.split('/').pop() || 'file'
  a.click()
  
  URL.revokeObjectURL(url)
}
```

---

## 🗑️ Deletar Arquivos

### Deletar Avatar

```typescript
async function deleteAvatar(userId: string) {
  const { error } = await supabase.storage
    .from('avatars')
    .remove([`${userId}/avatar.png`])

  if (error) throw error
}
```

### Deletar Anexo

```typescript
async function deleteAttachment(filePath: string) {
  const { error } = await supabase.storage
    .from('attachments')
    .remove([filePath])

  if (error) throw error
}
```

---

## 📋 Listar Arquivos

### Listar Entregas de um Aluno

```typescript
async function listStudentDeliveries(studentId: string) {
  const { data, error } = await supabase.storage
    .from('deliveries')
    .list(studentId, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' }
    })

  if (error) throw error
  return data
}
```

---

## ✅ Validações Recomendadas

### Validar Tipo de Arquivo

```typescript
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

function validateFileType(file: File, allowedTypes: string[]) {
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Tipo de arquivo não permitido: ${file.type}`)
  }
}
```

### Validar Tamanho de Arquivo

```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function validateFileSize(file: File) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Arquivo muito grande. Máximo: 10MB')
  }
}
```

### Componente de Upload Completo

```tsx
import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface FileUploadProps {
  bucket: string
  path: string
  onSuccess: (url: string) => void
  accept?: string
  maxSize?: number
}

export function FileUpload({ 
  bucket, 
  path, 
  onSuccess, 
  accept,
  maxSize = 10 * 1024 * 1024 
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tamanho
    if (file.size > maxSize) {
      toast.error(`Arquivo muito grande. Máximo: ${maxSize / 1024 / 1024}MB`)
      return
    }

    try {
      setUploading(true)
      setProgress(0)

      const fileName = `${path}/${Date.now()}-${file.name}`

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          onUploadProgress: (progress) => {
            setProgress((progress.loaded / progress.total) * 100)
          }
        })

      if (error) throw error

      // Obter URL
      let url: string
      if (bucket === 'avatars') {
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName)
        url = urlData.publicUrl
      } else {
        const { data: urlData } = await supabase.storage
          .from(bucket)
          .createSignedUrl(fileName, 3600)
        url = urlData?.signedUrl || ''
      }

      toast.success('Arquivo enviado com sucesso!')
      onSuccess(url)
    } catch (error) {
      console.error('Erro no upload:', error)
      toast.error('Erro ao enviar arquivo')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <div>
      <input
        type="file"
        accept={accept}
        onChange={handleUpload}
        disabled={uploading}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload">
        <Button disabled={uploading} asChild>
          <span>
            {uploading ? `Enviando... ${progress.toFixed(0)}%` : 'Escolher Arquivo'}
          </span>
        </Button>
      </label>
    </div>
  )
}
```

---

## 🔒 Políticas RLS Aplicadas

### Avatars (Público)
- ✅ SELECT: Todos
- ✅ INSERT: Apenas para própria pasta do usuário
- ✅ UPDATE: Apenas para própria pasta do usuário
- ✅ DELETE: Apenas para própria pasta do usuário

### Attachments (Privado)
- ✅ SELECT: Professores e secretaria
- ✅ INSERT: Professores e secretaria
- ✅ DELETE: Professores e secretaria

### Deliveries (Privado)
- ✅ SELECT: Aluno (próprias entregas) + Professores (turmas) + Secretaria
- ✅ INSERT: Aluno (própria pasta)
- ✅ DELETE: Aluno (própria pasta) + Secretaria

---

## ⚡ Boas Práticas

1. **Sempre validar arquivos no cliente antes de enviar**
2. **Usar URLs assinadas para arquivos privados**
3. **Implementar progress bars para uploads grandes**
4. **Limpar URLs temporárias após uso**
5. **Implementar retry logic para uploads que falharem**
6. **Comprimir imagens antes de enviar quando possível**
7. **Usar nomes únicos (timestamp) para evitar conflitos**
8. **Deletar arquivos não utilizados periodicamente**

---

## 🚨 Troubleshooting

### Erro: "Row Level Security"
- Verifique se o usuário está autenticado
- Verifique se o caminho do arquivo respeita as políticas RLS

### Erro: "Payload too large"
- Arquivo muito grande (limite do Supabase: 50MB)
- Considere comprimir ou dividir o arquivo

### Erro: "Invalid file type"
- Arquivo não permitido pelo bucket
- Verifique as configurações do bucket

### URL expirada
- URLs assinadas têm tempo de expiração
- Gere nova URL quando necessário
