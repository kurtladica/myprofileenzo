const form = document.querySelector('#apk-form');
const output = document.querySelector('#output');
const downloadButton = document.querySelector('#download-btn');
const statusPill = document.querySelector('#status-pill');
const previewName = document.querySelector('#preview-name');
const previewType = document.querySelector('#preview-type');
const previewFeatures = document.querySelector('#preview-features');

let latestProject = '';

const getSelectedFeatures = () => [...document.querySelectorAll('.checkbox-list input:checked')].map((item) => item.value);

const sanitizePackageName = (name) => name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.{2,}/g, '.') || 'ai.generated.app';

const renderPreview = () => {
    const appName = document.querySelector('#app-name').value || 'Untitled AI App';
    const appType = document.querySelector('#app-type').value;
    const uiStyle = document.querySelector('#ui-style').value;
    const features = getSelectedFeatures();

    previewName.textContent = appName;
    previewType.textContent = `${appType} • ${uiStyle}`;
    previewFeatures.innerHTML = features.map((feature) => `<span>${feature}</span>`).join('');
};

const localPlan = ({ appName, appIdea, appType, uiStyle, features }) => {
    const packageName = `com.${sanitizePackageName(appName)}`;
    const permissions = features
        .filter((feature) => ['Push notifications', 'Camera access', 'Location services'].includes(feature))
        .map((feature) => ({
            'Push notifications': 'android.permission.POST_NOTIFICATIONS',
            'Camera access': 'android.permission.CAMERA',
            'Location services': 'android.permission.ACCESS_FINE_LOCATION',
        })[feature]);

    return `# ${appName} Android Starter Plan\n\n` +
        `Package: ${packageName}\n` +
        `Category: ${appType}\n` +
        `UI Style: ${uiStyle}\n\n` +
        `## App idea\n${appIdea}\n\n` +
        `## Recommended screens\n` +
        `- Launch screen with onboarding and privacy notice\n` +
        `- Home dashboard with smart actions and recent activity\n` +
        `- AI builder/chat screen for prompts and generated content\n` +
        `- Settings screen for API key, theme, and export options\n\n` +
        `## Enabled features\n${features.map((feature) => `- ${feature}`).join('\n')}\n\n` +
        `## Android permissions\n${permissions.length ? permissions.map((permission) => `- ${permission}`).join('\n') : '- No dangerous permissions selected'}\n\n` +
        `## Starter Kotlin MainActivity.kt\n` +
        '```kotlin\n' +
        `package ${packageName}\n\n` +
        `class MainActivity : ComponentActivity() {\n` +
        `    override fun onCreate(savedInstanceState: Bundle?) {\n` +
        `        super.onCreate(savedInstanceState)\n` +
        `        setContent { ${appName.replace(/[^A-Za-z0-9]/g, '')}App() }\n` +
        `    }\n` +
        `}\n` +
        '```\n\n' +
        `## Next build steps\n` +
        `1. Create a new Android Studio project using Kotlin and Jetpack Compose.\n` +
        `2. Apply the package name and permissions above in AndroidManifest.xml.\n` +
        `3. Add Gemini calls through a backend endpoint, not directly in released APK code.\n` +
        `4. Run a debug build, test on a phone, then create a signed release APK or AAB.`;
};

const askGemini = async (apiKey, payload) => {
    const prompt = `Create a concise Android APK project blueprint for this app. Include screens, data model, API integration plan, permissions, and build steps. App brief: ${JSON.stringify(payload)}`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    if (!response.ok) {
        throw new Error(`Gemini request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.map((part) => part.text).join('\n') || '';
};

form.addEventListener('input', renderPreview);
form.addEventListener('change', renderPreview);

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = {
        appName: formData.get('appName').trim(),
        appIdea: formData.get('appIdea').trim(),
        appType: formData.get('appType'),
        uiStyle: formData.get('uiStyle'),
        features: getSelectedFeatures(),
    };
    const apiKey = formData.get('apiKey').trim();

    statusPill.textContent = apiKey ? 'Asking Gemini...' : 'Generated locally';
    output.textContent = 'Building your APK project plan...';
    downloadButton.disabled = true;

    try {
        latestProject = apiKey ? await askGemini(apiKey, payload) : localPlan(payload);
        if (!latestProject) {
            latestProject = localPlan(payload);
        }
        output.textContent = latestProject;
        statusPill.textContent = apiKey ? 'Gemini plan ready' : 'Local plan ready';
        downloadButton.disabled = false;
    } catch (error) {
        latestProject = localPlan(payload);
        output.textContent = `${latestProject}\n\n## Gemini notice\n${error.message}. A local fallback plan was generated instead.`;
        statusPill.textContent = 'Fallback ready';
        downloadButton.disabled = false;
    }
});

downloadButton.addEventListener('click', () => {
    if (!latestProject) return;
    const blob = new Blob([latestProject], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ai-apk-maker-starter-plan.md';
    link.click();
    URL.revokeObjectURL(url);
});

renderPreview();
