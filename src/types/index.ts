export type Role = {
  id: number;
  name: string;
  slug?: string;
};

export type User = {
  id: number;
  name: string;
  display_name?: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  location?: string | null;
  bio?: string | null;
  photo?: string | null;
  photo_url?: string | null;
  cover_photo?: string | null;
  cover_photo_url?: string | null;
  account_status?: string | null;
  siret?: string | null;
  coach_title?: string | null;
  coach_short_description?: string | null;
  coach_speciality?: string | null;
  coach_experience_years?: number | string | null;
  coach_certifications?: string[] | string | null;
  coach_languages?: string[] | string | null;
  roles?: Role[];
};

export type AuthSession = {
  token: string;
  user: User;
};

export type Annonce = {
  id: number;
  titre?: string | null;
  title?: string | null;
  contenu?: string | null;
  description?: string | null;
  category?: string | null;
  type_prestation?: string | null;
  price?: string | number | null;
  duration?: string | number | null;
  is_online?: boolean | number | null;
  location?: string | null;
  city?: string | null;
  address?: string | null;
  image?: string | null;
  image_url?: string | null;
  status?: string | null;
  announcement_type?: 'coach_service' | 'client_request' | string | null;
  is_boosted?: boolean;
  user_id?: number | null;
  user?: User | null;
  intervenant?: User | null;
  available_days?: string[] | null;
  available_hours?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ForumReaction = 'like' | 'love' | 'helpful' | 'celebrate';

export type ForumChannel = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  is_official?: boolean;
  is_active?: boolean;
  sort_order?: number;
  discussions_count?: number;
};

export type ForumAuthor = Pick<User, 'id' | 'name' | 'display_name' | 'photo' | 'photo_url' | 'coach_title'>;

export type ForumDiscussion = {
  id: number;
  channel_id: number;
  author_id: number;
  title: string;
  body: string;
  is_pinned?: boolean;
  is_locked?: boolean;
  views_count?: number;
  comments_count?: number;
  reactions_count?: number;
  reaction_counts?: Partial<Record<ForumReaction, number>>;
  viewer_reaction?: ForumReaction | null;
  last_activity_at?: string | null;
  created_at: string;
  updated_at?: string;
  author?: ForumAuthor | null;
  channel?: ForumChannel | null;
  can_edit?: boolean;
  can_moderate?: boolean;
};

export type ForumComment = {
  id: number;
  discussion_id: number;
  author_id: number;
  parent_id?: number | null;
  body: string;
  created_at: string;
  updated_at?: string;
  author?: ForumAuthor | null;
  reaction_counts?: Partial<Record<ForumReaction, number>>;
  viewer_reaction?: ForumReaction | null;
  can_edit?: boolean;
  children?: ForumComment[];
};

export type ForumNotification = {
  id: number;
  type: string;
  title: string;
  body?: string | null;
  url?: string | null;
  read_at?: string | null;
  created_at: string;
  actor?: ForumAuthor | null;
};

export type Coach = User & {
  about?: string | null;
  description?: string | null;
  speciality?: string | null;
  specialty?: string | null;
  services?: string[] | string | null;
  profession?: string | null;
  job_title?: string | null;
  title?: string | null;
  rating?: number | string | null;
  reviews_count?: number | string | null;
  created_at?: string | null;
};

export type Reservation = {
  id: number;
  annonce_id?: number | null;
  client_id?: number | null;
  intervenant_id?: number | null;
  reservation_date?: string | null;
  reservation_time?: string | null;
  guests?: number | null;
  note?: string | null;
  price?: string | number | null;
  total_client_amount?: string | number | null;
  currency?: string | null;
  status?: string | null;
  payment_status?: string | null;
  prestation_status?: string | null;
  is_paid?: boolean | number;
  annonce?: Annonce | null;
  client?: User | null;
  intervenant?: User | null;
  visio_session_id?: number | null;
  visio_session?: { id?: number | null; status?: string | null } | null;
  title?: string | null;
  start?: string | null;
  end?: string | null;
  payement?: Payment | null;
  review?: Review | null;
  dispute_reason?: string | null;
  validation_deadline?: string | null;
};

export type VisioSession = {
  id: number;
  title: string;
  description?: string | null;
  coach_id?: number | null;
  start_at: string;
  duration_minutes: number;
  min_participants: number;
  max_participants?: number | null;
  price?: string | number | null;
  currency?: string | null;
  status: string;
  join_url?: string | null;
  room_name?: string | null;
  available_places?: number | null;
  paid_participants_count?: number;
  coach?: User | null;
  intervenant?: User | null;
};

export type MessageUser = Pick<User, 'id' | 'name' | 'email' | 'photo' | 'photo_url'> & {
  role?: string | null;
};

export type MessageItem = {
  id: number;
  conversation_id: number;
  sender_id: number;
  message?: string | null;
  media_full_url?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  reactions?:
    | { like?: number; dislike?: number }
    | { id?: number; user_id?: number; reaction?: 'like' | 'dislike' }[]
    | null;
  likes_count?: number | null;
  dislikes_count?: number | null;
  my_reaction?: 'like' | 'dislike' | null;
  sender?: MessageUser | null;
  created_at?: string | null;
  updated_at?: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  is_edited?: boolean | null;
  is_deleted?: boolean | null;
  parent_id?: number | null;
  parent?: MessageItem | null;
  type?: 'message' | 'offer' | string | null;
  offer?: Offer | null;
  local_pending?: boolean;
  local_error?: boolean;
};

export type OfferStatus = 'draft' | 'sent' | 'paid' | 'cancelled' | 'expired' | string;

export type Offer = {
  id: number;
  conversation_id?: number;
  coach_id?: number;
  client_id?: number;
  title: string;
  description?: string | null;
  session_count: number;
  amount_total: string | number;
  wallet_amount?: string | number | null;
  stripe_amount?: string | number | null;
  currency?: string | null;
  status: OfferStatus;
  expires_at?: string | null;
  checkout_url?: string | null;
  coach?: User | null;
  client?: User | null;
  pack?: Pack | null;
};

export type PackSession = {
  id: number;
  pack_id: number;
  sequence?: number;
  amount_due?: string | number | null;
  status: string;
  scheduled_at?: string | null;
  completed_at?: string | null;
  validated_at?: string | null;
  dispute_reason?: string | null;
  cancellation_reason?: string | null;
};

export type Pack = {
  id: number;
  offer_id?: number;
  client_id?: number;
  coach_id?: number;
  amount_total?: string | number | null;
  session_count?: number;
  currency?: string | null;
  status: string;
  coach?: User | null;
  client?: User | null;
  offer?: Offer | null;
  sessions?: PackSession[];
  created_at?: string | null;
};

export type Wallet = {
  id: number;
  balance?: string | number | null;
  currency?: string | null;
};

export type WalletTransaction = {
  id: number;
  amount?: string | number | null;
  type?: string | null;
  description?: string | null;
  created_at?: string | null;
};

export type AppNotification = {
  id: string;
  type?: string;
  data?: {
    type?: string;
    title?: string;
    body?: string;
    url?: string;
    conversation_id?: number;
    message_id?: number;
    reservation_id?: number;
    annonce_id?: number;
    pack_id?: number;
    actor_name?: string;
  };
  read_at?: string | null;
  created_at?: string | null;
};

export type Conversation = {
  id: number;
  client_id?: number | null;
  intervenant_id?: number | null;
  client?: MessageUser | null;
  intervenant?: MessageUser | null;
  messages?: MessageItem[];
  unread_count?: number | null;
  last_message_at?: string | null;
  updated_at?: string | null;
};

export type ClientOnboarding = {
  goals?: string[];
  level?: string | null;
  training_preferences?: string[];
  availability?: string[];
  health_constraints?: string[];
  measurements?: Record<string, string | number>;
  lifestyle?: Record<string, unknown>;
  emergency_contact?: Record<string, string>;
  answers?: Record<string, unknown>;
  is_completed?: boolean;
};

export type Favorite = {
  id: number;
  annonce_id?: number;
  annonce?: Annonce | null;
};

export type Payment = {
  id: number;
  reservation_id?: number | null;
  amount?: string | number | null;
  currency?: string | null;
  status?: string | null;
  payout_status?: string | null;
  created_at?: string | null;
  reservation?: Reservation | null;
};

export type Review = {
  id: number;
  rating: number;
  comment?: string | null;
  status?: string | null;
  client?: User | null;
  created_at?: string | null;
};

export type FitnessQuestion = {
  key: string;
  label: string;
  type:
    | 'text'
    | 'textarea'
    | 'number'
    | 'date'
    | 'single_choice'
    | 'multiple_choice'
    | 'boolean';
  required?: boolean;
  options?: string[];
};

export type FitnessAssessmentForm = {
  id: number;
  title?: string | null;
  description?: string | null;
  version?: number | null;
  questions?: FitnessQuestion[];
};

export type FitnessAssessment = {
  id: number;
  client_id?: number | null;
  form_id?: number | null;
  answers?: Record<string, unknown>;
  status?: 'draft' | 'submitted' | 'reviewed' | string | null;
  coach_notes?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  form?: FitnessAssessmentForm | null;
  reviewer?: User | null;
  created_at?: string | null;
};

export type ClientNote = {
  id: number;
  client_id?: number | null;
  intervenant_id?: number | null;
  reservation_id?: number | null;
  author_id?: number | null;
  visibility?: 'private' | 'shared' | string | null;
  title?: string | null;
  content?: string | null;
  is_pinned?: boolean | number | null;
  author?: User | null;
  intervenant?: User | null;
  reservation?: Pick<Reservation, 'id' | 'reservation_date' | 'reservation_time' | 'status'> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ClientHistory = {
  client?: User | null;
  summary?: {
    reservations_count?: number;
    completed_reservations_count?: number;
    paid_reservations_count?: number;
    notes_count?: number;
  };
  reservations?: Reservation[];
};

export type DocumentItem = {
  id: number;
  name?: string | null;
  document_type?: string | null;
  document_number?: string | null;
  issuing_organization?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
  file_path?: string | null;
  file_url?: string | null;
  status?: string | null;
  rejection_reason?: string | null;
  created_at?: string | null;
};

export type StripeConnectStatus = {
  connected?: boolean;
  onboarding_completed?: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  stripe_account_id?: string | null;
};

export type CoachRevenue = {
  total_paye?: string | number | null;
  total_commission?: string | number | null;
  total_recu?: string | number | null;
};
