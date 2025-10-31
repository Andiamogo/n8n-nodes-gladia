import { IExecuteFunctions, IHttpRequestOptions, INodeExecutionData, INodeType, INodeTypeDescription, NodeOperationError } from "n8n-workflow";
import { Buffer } from 'buffer';
import { dictArrayToObject, entriesToObject, normalizeDiarization, normalizeVocabulary, pick } from "./helpers";
import { AudioToLLMConfig, CallbackConfig, DiarizationConfig, LanguageConfig, PreRecordedInitRequest, PreRecordedInitResponse, StructuredDataExtractionConfig, SubtitlesConfig, SummarizationConfig, TranslationConfig } from "./types";

export class Gladia implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Gladia',
        name: 'gladia',
        icon: 'file:gladia2.svg',
        group: ['transform'],
        version: 1,
        documentationUrl: 'https://docs.gladia.io/api-reference',
        description: 'Get data from Gladia\'s API',
        defaults: {
            name: 'Gladia'
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [{
            name: 'gladiaApi',
            required: true,
        },],
        requestDefaults: {
            baseURL: 'https://api.gladia.io',
        },
        properties: [
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Upload File',
                        value: 'uploadfile',
                        action: 'Upload file',
                        description: 'Upload an audio file to Gladia',
                    },
                    {
                        name: 'Start Transcription',
                        value: 'starttranscription',
                    },
                    {
                        name: 'Get Transcription',
                        value: 'gettranscription'
                    },
                ],
                default: 'uploadfile'
            },
            {
                displayName: 'Audio File',
                name: "file",
                type: "string",
                default: "",
                displayOptions: {
                    show: {
                        operation: ['uploadfile']
                    }
                }
            },
            {
                displayName: 'Audio URL',
                name: "audio_url",
                type: "string",
                default: "",
                displayOptions: {
                    show: {
                        operation: ['starttranscription']
                    }
                }
            },
            {
                displayName: 'Transcription ID',
                name: "id",
                type: "string",
                default: "",
                displayOptions: {
                    show: {
                        operation: ['gettranscription']
                    }
                }
            },
            {
                displayName: 'Language Config',
                name: 'language_config',
                type: 'collection',
                default: {},
                displayOptions: {
                    show: {
                        operation: ['starttranscription']
                    }
                },
                options: [
                    {
                        displayName: 'Languages (ISO 639-1)',
                        name: 'languages',
                        type: 'string',
                        typeOptions: { multipleValues: true }, // []
                        default: [],
                    },
                    { displayName: 'Code Switching', name: 'code_switching', type: 'boolean', default: false },
                ],
            },
            {
                displayName: 'Custom Vocabulary',
                name: 'custom_vocabulary',
                type: 'boolean',
                default: false,
                displayOptions: {
                    show: {
                        operation: ['starttranscription']
                    }
                },
            },
            {
                displayName: 'Custom Vocabulary Config',
                name: 'custom_vocabulary_config',
                type: 'collection',
                displayOptions: { 
                    show: { 
                        custom_vocabulary: [true], 
                        operation: ['starttranscription'] 
                    } 
                },
                default: {},
                options: [
                    {
                    displayName: 'Vocabulary',
                    name: 'vocabulary',
                    type: 'fixedCollection',
                    typeOptions: { multipleValues: true },
                    default: {},
                    options: [
                        {
                            displayName: 'Simple Term',
                            name: 'simple',
                            values: [
                                { displayName: 'Value', name: 'value', type: 'string', default: '' },
                            ],
                        },
                        {
                            displayName: 'Advanced Term',
                            name: 'advanced',
                            values: [
                                { displayName: 'Value', name: 'value', type: 'string', default: '' },
                                { displayName: 'Pronunciations', name: 'pronunciations', type: 'string', typeOptions: { multipleValues: true }, default: [], },
                                { displayName: 'Intensity', name: 'intensity', type: 'number', default: 0.5 },
                                { displayName: 'Language (ISO 639-1)', name: 'language', type: 'string', default: '' },
                            ],
                        },
                    ],
                    },
                    { displayName: 'Default Intensity', name: 'default_intensity', type: 'number', default: 0.5 },
                ],
            },
            {
                displayName: 'Translation',
                name: 'translation',
                type: 'boolean',
                default: false,
                displayOptions: {
                    show: {
                        operation: ['starttranscription']
                    }
                },
            },
            {
                displayName: 'Translation Config',
                name: 'translation_config',
                type: 'collection',
                displayOptions: { show: { translation: [true], operation: ['starttranscription'] } },
                default: {},
                options: [
                    {
                        displayName: 'Target Languages (ISO 639-1)',
                        name: 'target_languages',
                        type: 'string',
                        typeOptions: { multipleValues: true },
                        default: [],
                    },
                    { displayName: 'Model', name: 'model', type: 'options', options: [{ name: 'Base', value: 'base' }, { name: 'Enhanced', value: 'enhanced' }], default: 'base' },
                    { displayName: 'Match Original Utterances', name: 'match_original_utterances', type: 'boolean', default: true },
                    { displayName: 'Lipsync', name: 'lipsync', type: 'boolean', default: true },
                    { displayName: 'Context Adaptation', name: 'context_adaptation', type: 'boolean', default: true },
                    { displayName: 'Context', name: 'context', type: 'string', default: '' },
                    { displayName: 'Informal', name: 'informal', type: 'boolean', default: false },
                ],
            },
            {
                displayName: 'Custom Spelling',
                name: 'custom_spelling',
                type: 'boolean',
                default: false,
                displayOptions: {
                    show: {
                        operation: ['starttranscription']
                    }
                },
            },
            {
                displayName: 'Custom Spelling Config',
                name: 'custom_spelling_config',
                type: 'collection',
                displayOptions: { show: { custom_spelling: [true], operation: ['starttranscription'] } },
                default: {},
                options: [
                    {
                        displayName: 'Spelling Dictionary',
                        name: 'spelling_dictionary',
                        type: 'fixedCollection',
                        placeholder: "Add Item",
                        typeOptions: { multipleValues: true },
                        default: {},
                        options: [
                            {
                                displayName: 'Entry',
                                name: 'entry',
                                values: [
                                    { displayName: 'Term', name: 'key', type: 'string', default: '' },
                                    {
                                        displayName: 'Variants',
                                        name: 'values',
                                        type: 'string',
                                        typeOptions: { multipleValues: true },
                                        default: [],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                displayName: 'Subtitles',
                name: 'subtitles',
                type: 'boolean',
                default: false,
                displayOptions: {
                    show: {
                        operation: ['starttranscription']
                    }
                },
            },
            {
                displayName: 'Subtitles Config',
                name: 'subtitles_config',
                type: 'collection',
                displayOptions: { show: { subtitles: [true], operation: ['starttranscription'] } },
                default: {},
                options: [
                    {
                        displayName: 'Formats',
                        name: 'formats',
                        type: 'multiOptions',
                        options: [
                            { name: 'Srt', value: 'srt' },
                            { name: 'Vtt', value: 'vtt' },
                        ],
                        default: [],
                    },
                    { displayName: 'Minimum Duration (S)', name: 'minimum_duration', type: 'number', default: 1 },
                    { displayName: 'Maximum Duration (S)', name: 'maximum_duration', type: 'number', default: 15.5 },
                    { displayName: 'Max Chars per Row', name: 'maximum_characters_per_row', type: 'number', default: 2 },
                    { displayName: 'Max Rows per Caption', name: 'maximum_rows_per_caption', type: 'number', default: 3 },
                    {
                        displayName: 'Style',
                        name: 'style',
                        type: 'options',
                        options: [
                            { name: 'Default', value: 'default' }, 
                            { name: 'Compliance', value: 'compliance' }
                        ],
                        default: 'default',
                    },
                ],
            },
            {
                displayName: 'Structured Data Extraction',
                name: 'structured_data_extraction',
                type: 'boolean',
                default: false,
                displayOptions: {
                    show: {
                        operation: ['starttranscription']
                    }
                },
            },
            {
                displayName: 'Structured Data Extraction Config',
                name: 'structured_data_extraction_config',
                type: 'collection',
                placeholder: "Add Item",
                displayOptions: { show: { structured_data_extraction: [true], operation: ['starttranscription'] } },
                default: {},
                options: [
                    {
                        displayName: 'Classes',
                        name: 'classes',
                        type: 'string',
                        typeOptions: { multipleValues: true },
                        default: [],
                    },
                ],
            },
            {
                displayName: 'Audio to LLM',
                name: 'audio_to_llm',
                type: 'boolean',
                default: false,
                displayOptions: {
                    show: {
                        operation: ['starttranscription']
                    }
                },
            },
            {
                displayName: 'Audio → LLM Config',
                name: 'audio_to_llm_config',
                type: 'collection',
                placeholder: "Add Item",
                displayOptions: { show: { audio_to_llm: [true], operation: ['starttranscription'] } },
                default: {},
                options: [
                    {
                        displayName: 'Prompts',
                        name: 'prompts',
                        type: 'string',
                        typeOptions: { multipleValues: true },
                        default: [],
                    },
                ],
            },
            {
                displayName: 'Custom Metadata',
                name: 'custom_metadata',
                type: 'fixedCollection',
                typeOptions: { multipleValues: true },
                default: {},
                displayOptions: {
                    show: {
                        operation: ['starttranscription']
                    }
                },
                options: [
                    {
                        displayName: 'Entry',
                        name: 'entry',
                        values: [
                            { displayName: 'Key', name: 'key', type: 'string', default: '' },
                            { displayName: 'Value', name: 'value', type: 'string', default: '' },
                        ],
                    },
                ],
            },
            {
                displayName: 'Diarization',
                name: 'diarization',
                type: 'boolean',
                default: false,
                displayOptions: {
                    show: {
                        operation: ['starttranscription']
                    }
                },
            },
            {
                displayName: 'Diarization Config',
                name: 'diarization_config',
                type: 'collection',
                displayOptions: { show: { diarization: [true], operation: ['starttranscription'] } },
                default: {},
                options: [
                    {
                        displayName: 'Mode',
                        name: 'mode',
                        type: 'options',
                        description: 'Choose fixed speaker count or a min–max range',
                        options: [
                            { name: 'Fixed Speaker Count', value: 'fixed' },
                            { name: 'Range (Min/Max)', value: 'range' },
                        ],
                        default: 'fixed',
                    },
                    // Fixed count
                    {
                        displayName: 'Number of Speakers',
                        name: 'number_of_speakers',
                        type: 'number',
                        default: 2,
                        displayOptions: { show: { mode: ['fixed'] } },
                        typeOptions: { minValue: 1 },
                    },
                    // Range
                    {
                        displayName: 'Min Speakers',
                        name: 'min_speakers',
                        type: 'number',
                        default: 1,
                        displayOptions: { show: { mode: ['range'] } },
                        typeOptions: { minValue: 1 },
                    },
                    {
                        displayName: 'Max Speakers',
                        name: 'max_speakers',
                        type: 'number',
                        default: 2,
                        displayOptions: { show: { mode: ['range'] } },
                        typeOptions: { minValue: 1 },
                    },
                    {
                        displayName: 'Enhanced',
                        name: 'enhanced',
                        type: 'boolean',
                        default: false,
                    },
                ],
            },
            {
                displayName: 'Summarization',
                name: 'summarization',
                type: 'boolean',
                default: false,
                displayOptions: {
                    show: {
                        operation: ['starttranscription']
                    }
                },
            },
            {
                displayName: 'Summarization Config',
                name: 'summarization_config',
                type: 'collection',
                placeholder: "Add Item",
                displayOptions: { show: { summarization: [true], operation: ['starttranscription'] } },
                default: {},
                options: [
                    {
                        displayName: 'Type',
                        name: 'type',
                        type: 'options',
                        options: [
                            { name: 'General', value: 'general' },
                            { name: 'Bullet Points', value: 'bullet_points' },
                            { name: 'Concise', value: 'concise' },
                        ],
                        default: 'general',
                    },
                ],
            },
            {
                displayName: 'Callback',
                name: 'callback',
                type: 'boolean',
                default: false,
                displayOptions: {
                    show: {
                        operation: ['starttranscription']
                    }
                },
            },
            {
                displayName: 'Callback Config',
                name: 'callback_config',
                type: 'collection',
                displayOptions: { show: { callback: [true], operation: ['starttranscription'] } },
                default: {},
                options: [
                    {
                        displayName: 'URL',
                        name: 'url',
                        type: 'string',
                        placeholder: 'https://yourapp.example/webhooks/gladia',
                        default: '',
                        description: 'Publicly reachable HTTPS endpoint',
                    },
                    {
                        displayName: 'Method',
                        name: 'method',
                        type: 'options',
                        options: [
                            { name: 'POST', value: 'POST' },
                            { name: 'PUT', value: 'PUT' },
                        ],
                        default: 'POST',
                    },
                ],
            },
            {
                displayName: 'Moderation',
                name: 'moderation',
                type: 'boolean',
                default: false,
                displayOptions: {
                    show: {
                        operation: ['starttranscription']
                    }
                },
            },
            {
                displayName: 'Named Entity Recognition',
                name: 'named_entity_recognition',
                type: 'boolean',
                default: false,
                displayOptions: {
                    show: {
                        operation: ['starttranscription']
                    }
                },
            },
            {
                displayName: 'Chapterization',
                name: 'chapterization',
                type: 'boolean',
                default: false,
                displayOptions: {
                    show: {
                        operation: ['starttranscription']
                    }
                },
            },
            {
                displayName: 'Name Consistency',
                name: 'name_consistency',
                type: 'boolean',
                default: false,
                displayOptions: {
                    show: {
                        operation: ['starttranscription']
                    }
                },
            },
            {
                displayName: 'Sentiment Analysis',
                name: 'sentiment_analysis',
                type: 'boolean',
                default: false,
                displayOptions: {
                    show: {
                        operation: ['starttranscription']
                    }
                },
            },
            {
                displayName: 'Sentences',
                name: 'sentences',
                type: 'boolean',
                default: false,
                displayOptions: {
                    show: {
                        operation: ['starttranscription']
                    }
                },
            },
            {
                displayName: 'Display Mode',
                name: 'display_mode',
                type: 'boolean',
                default: false,
                displayOptions: {
                    show: {
                        operation: ['starttranscription']
                    }
                },
            },
            {
                displayName: 'Punctuation Enhanced',
                name: 'punctuation_enhanced',
                type: 'boolean',
                default: false,
                displayOptions: {
                    show: {
                        operation: ['starttranscription']
                    }
                },
            },
        ]
    }
	
    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {

            const operation = (this.getNodeParameter('operation', i) as string);

            if (operation === 'uploadfile') {
                try {
                    const binaryPropertyName = (this.getNodeParameter('file', i) as string);
    
                    const item = items[i];
                    
                    if (!item.binary || !item.binary[binaryPropertyName]) {
                        throw new NodeOperationError(this.getNode(), `No binary data found under property "${binaryPropertyName}"`, {
                            itemIndex: i,
                        });
                    }
    
                    const binary = this.helpers.assertBinaryData(i, binaryPropertyName)
                    const buffer = Buffer.from(binary.data, 'base64')
    
                    const options: IHttpRequestOptions = {
                        method: 'POST',
                        url: 'https://api.gladia.io/v2/upload',
                        ignoreHttpStatusErrors: true,
                        returnFullResponse: true,
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        },
                        body: {
                            audio: buffer
                        },
                    };
    
                    const response = await this.helpers.httpRequestWithAuthentication.call(this, 'gladiaApi', options)
    
                    const body = response?.body ?? response;
    
                    returnData.push({
                        json: {
                            ...((typeof body === 'object' && body) ? body : { result: body }),
                        },
                    });

                } catch (error) {
                    if (this.continueOnFail()) {
                        returnData.push({
                            json: { error: (error as Error).message },
                            pairedItem: { item: i },
                        });
                        continue;
                    }
                    throw new NodeOperationError(this.getNode(), (error as Error).message, { itemIndex: i });
                }
            }
            else if (operation === 'starttranscription') {

                try {
                    const audioUrl = this.getNodeParameter('audio_url', i) as string

                    const body: PreRecordedInitRequest = { 'audio_url': audioUrl };

                    // Callback
                    if (this.getNodeParameter('callback', i) as boolean) {
                        const cfg = this.getNodeParameter('callback_config', i, {}) as CallbackConfig;
                        body.callback = true;
                        body.callback_config = pick(cfg, ['url', 'method']);
                    }

                    // Subtitles
                    if (this.getNodeParameter('subtitles', i) as boolean) {
                        const cfg = this.getNodeParameter('subtitles_config', i, {}) as SubtitlesConfig;
                        body.subtitles = true;
                        body.subtitles_config = pick(cfg, [
                            'formats',
                            'minimum_duration',
                            'maximum_duration',
                            'maximum_characters_per_row',
                            'maximum_rows_per_caption',
                            'style',
                        ]);
                    }

                    // Diarization
                    if (this.getNodeParameter('diarization', i) as boolean) {
                        const cfg = this.getNodeParameter('diarization_config', i, {}) as DiarizationConfig;
                        body.diarization = true;
                        body.diarization_config = normalizeDiarization(cfg);
                    }

                    // Summarization
                    if (this.getNodeParameter('summarization', i) as boolean) {
                        const cfg = this.getNodeParameter('summarization_config', i, {}) as SummarizationConfig;
                        body.summarization = true;
                        body.summarization_config = pick(cfg, ['type']);
                    }

                    // Translation
                    if (this.getNodeParameter('translation', i) as boolean) {
                        const cfg = this.getNodeParameter('translation_config', i, {}) as TranslationConfig;
                        body.translation = true;
                        body.translation_config = pick(cfg, [
                            'target_languages',
                            'model',
                            'match_original_utterances',
                            'lipsync',
                            'context_adaptation',
                            'context',
                            'informal',
                        ]);
                    }

                    // Custom Vocabulary
                    if (this.getNodeParameter('custom_vocabulary', i) as boolean) {
                        const cfg = this.getNodeParameter('custom_vocabulary_config', i, {}) as any;
                        const outCfg: any = {};
                        outCfg.vocabulary = normalizeVocabulary(cfg.vocabulary || {});
                        if (cfg.default_intensity !== undefined) outCfg.default_intensity = cfg.default_intensity;
                        if (Object.keys(outCfg).length) {
                            body.custom_vocabulary = true;
                            body.custom_vocabulary_config = outCfg;
                        }
                    }

                    // Custom Spelling
                    if (this.getNodeParameter('custom_spelling', i) as boolean) {
                        const cfg = this.getNodeParameter('custom_spelling_config', i, {}) as any;
                        const dictEntries = cfg.spelling_dictionary?.entry;
                        const spelling_dictionary = dictArrayToObject(dictEntries);
                        body.custom_spelling = true;
                        body.custom_spelling_config = { spelling_dictionary };
                    }

                    // Structured Data Extraction
                    if (this.getNodeParameter('structured_data_extraction', i) as boolean) {
                        const cfg = this.getNodeParameter('structured_data_extraction_config', i, {}) as StructuredDataExtractionConfig;
                        body.structured_data_extraction = true;
                        body.structured_data_extraction_config = pick(cfg, ['classes']);
                    }

                    // Audio to LLM
                    if (this.getNodeParameter('audio_to_llm', i) as boolean) {
                        const cfg = this.getNodeParameter('audio_to_llm_config', i, {}) as AudioToLLMConfig;
                        body.audio_to_llm = true;
                        body.audio_to_llm_config = pick(cfg, ['prompts']);
                    }

                    // Language Config
                    {
                        const cfg = this.getNodeParameter('language_config', i, {}) as LanguageConfig;
                        const lc = pick(cfg, ['languages', 'code_switching']);
                        if (
                            (Array.isArray(lc?.languages) && lc.languages.length > 0) ||
                            typeof lc?.code_switching === 'boolean'
                        ) {
                            body.language_config = lc;
                        }
                    }

                    // Boolean fields
                    (
                        [
                            'moderation',
                            'named_entity_recognition',
                            'chapterization',
                            'name_consistency',
                            'sentiment_analysis',
                            'sentences',
                            'display_mode',
                            'punctuation_enhanced',
                        ] as const
                    ).forEach((flag) => {
                        if (this.getNodeParameter(flag, i) as boolean) (body as any)[flag] = true;
                    });

                    // Custom Metadata
                    {
                        const meta = this.getNodeParameter('custom_metadata', i, []) as Record<string, any>[];
                        if (Array.isArray(meta) && meta.length) {
                            const entries = meta.map((e) => e.entry);
                            const obj = entriesToObject(entries);
                            if (Object.keys(obj).length) body.custom_metadata = obj;
                        }
                    }

                    const options: IHttpRequestOptions = {
                        method: 'POST',
                        url: 'https://api.gladia.io/v2/pre-recorded',
                        ignoreHttpStatusErrors: true,
                        returnFullResponse: true,
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: body
                    }

                    const response = await this.helpers.httpRequestWithAuthentication.call(this, 'gladiaApi', options)

                    const responseBody = response?.body ?? response;

                    returnData.push({
                        json: {
                            ...((typeof responseBody === 'object' && responseBody) ? responseBody: { result: responseBody })
                        }
                    })

                } catch (error) {
                    if (this.continueOnFail()) {
                        returnData.push({
                            json: { error: (error as Error).message },
                            pairedItem: { item: i },
                        });
                        continue;
                    }
                    throw new NodeOperationError(this.getNode(), (error as Error).message, { itemIndex: i });
                }
            }

            else if (operation === 'gettranscription') {
                try {
                    const id = this.getNodeParameter('id', i) as string

                    const options: IHttpRequestOptions = {
                        method: 'GET',
                        url: `https://api.gladia.io/v2/pre-recorded/${id}`,
                        ignoreHttpStatusErrors: true,
                        returnFullResponse: true,
                    }

                    const response = await this.helpers.httpRequestWithAuthentication.call(this, 'gladiaApi', options)

                    const body: any = response?.body as PreRecordedInitResponse ?? response

                    returnData.push({
                        json: {
                            ...((typeof body == 'object' && body) ? body: { result: body })
                        }
                    })
                } catch (error) {
                    if (this.continueOnFail()) {
                        returnData.push({
                            json: { error: (error as Error).message },
                            pairedItem: { item: i },
                        });
                        continue;
                    }
                    throw new NodeOperationError(this.getNode(), (error as Error).message, { itemIndex: i });
                }
            }

        }
        return [returnData]
    }
}