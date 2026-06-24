export type DocumentType =
  | 'UMOWA_INWESTOR'
  | 'UMOWA_PODWYKONAWCA'
  | 'KOSZTORYS'
  | 'HARMONOGRAM'
  | 'PROJEKT_WYKONAWCZY'
  | 'SWZ'
  | 'FAKTURA'
  | 'INNE'

export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'ERROR'

export interface DocumentResponse {
  id: number
  name: string
  documentType: DocumentType
  aiIndexingMode: string
  status: string
  visibleForRoles: string[]
  projectId: number
  folderId: number | null
  createdAt: string
  extractedData: string | null
}

export interface ConversationResponse {
  id: number
  title: string
  createdAt: string
  lastMessage?: string
}

export interface AuthResponse {
  token: string
  userId: number
  email: string
  name: string
  companyRole: string
}

export type Role =
  | 'PODWYKONAWCA'
  | 'BRYGADZISTA'
  | 'INZYNIER'
  | 'KOSZTORYSANT'
  | 'KIEROWNIK'
  | 'ADMIN'
  | 'OWNER'

export interface ProjectResponse {
  id: number
  name: string
  description: string
  createdAt: string
  userRole: Role
}
