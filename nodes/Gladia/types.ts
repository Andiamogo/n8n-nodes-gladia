// ---------- Request ----------

export interface LanguageConfig {
  languages?: string[];        // ISO 639 codes
  code_switching?: boolean;    // allow multiple languages
}

export interface CustomVocabularyWord {
  value: string;
  pronunciations?: string[];
  intensity?: number;          // 0..1
  language?: string;           // ISO 639
}

export interface CustomVocabularyConfig {
  vocabulary: (string | CustomVocabularyWord)[];
  default_intensity?: number;  // 0..1
}

export interface SubtitlesConfig {
  formats: string[];           // ["srt", "vtt"]
  minimum_duration?: number;   // seconds
  maximum_duration?: number;   // seconds
  maximum_characters_per_row?: number;
  maximum_rows_per_caption?: number;
  style?: string;              // e.g. "default"
}

export interface DiarizationConfig {
  number_of_speakers?: number;
  min_speakers?: number;
  max_speakers?: number;
}

export interface TranslationConfig {
  target_languages: string[];
  model?: string;                      // e.g. "base"
  match_original_utterances?: boolean;
  lipsync?: boolean;
  context_adaptation?: boolean;
  context?: string;
  informal?: boolean;
}

export interface SummarizationConfig {
  type: string;                 // e.g. "general, bullet-points..."
}

export interface CustomSpellingConfig {
  spelling_dictionary: Record<string, string[]>; // word -> variants
}

export interface StructuredDataExtractionConfig {
  classes: string[];           // e.g. ["Persons", "Organizations"]
}

export interface AudioToLLMConfig {
  prompts: string[];
}

export interface CallbackConfig {
  url: string;
  method?: "POST" | "PUT";
}

export interface PreRecordedInitRequest {
  // required
  audio_url: string;

  // feature toggles + configs
  custom_vocabulary?: boolean | string[];         // beta per docs
  custom_vocabulary_config?: CustomVocabularyConfig;

  subtitles?: boolean;
  subtitles_config?: SubtitlesConfig;

  diarization?: boolean;
  diarization_config?: DiarizationConfig;

  translation?: boolean;
  translation_config?: TranslationConfig;

  summarization?: boolean;
  summarization_config?: SummarizationConfig;

  moderation?: boolean;
  named_entity_recognition?: boolean;
  chapterization?: boolean;
  name_consistency?: boolean;

  custom_spelling?: boolean;
  custom_spelling_config?: CustomSpellingConfig;

  structured_data_extraction?: boolean;
  structured_data_extraction_config?: StructuredDataExtractionConfig;

  sentiment_analysis?: boolean;

  audio_to_llm?: boolean;
  audio_to_llm_config?: AudioToLLMConfig;

  custom_metadata?: Record<string, unknown>;
  sentences?: boolean;
  display_mode?: boolean;
  punctuation_enhanced?: boolean;

  language_config?: LanguageConfig;

  callback_url?: string;
  callback?: boolean;
  callback_config?: CallbackConfig;
}

// ---------- Response ----------

export interface PreRecordedInitResponse {
  id: string;
  result_url: string;
}
