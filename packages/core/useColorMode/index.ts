import { Application, CSSUtils, Utils, isAndroid } from "@nativescript/core"
import { ref, Ref, watch, computed, onUnmounted } from "nativescript-vue"
import { useStorage } from "../useStorage"
import { setAutoSystemAppearanceChanged, systemAppearanceChanged } from "@nativescript/core/application"
const removeClass = CSSUtils.removeSystemCssClass;

export interface ElementSize {
    width: number
    height: number
}

export type BasicColorMode = 'light' | 'dark'
export type BasicColorSchema = BasicColorMode | 'auto'
export interface UseColorModeOptions<T extends string = BasicColorMode> {
    /**
     * The initial color mode
     *
     * @default 'auto'
     */
    initialValue?: T | BasicColorSchema

    /**
     * Prefix when adding value to the attribute
     */
    modes?: T[] | BasicColorSchema[]

    /**
     * A custom handler for handle the updates.
     * When specified, the default behavior will be overridden.
     *
     * @default undefined
     */
    onChanged?: (mode: T | BasicColorMode) => void

    /**
     * Key to persist the data into ApplicationSettings.
     *
     * Pass `null` to disable persistence
     *
     * @default 'nativevueuse-color-scheme'
     */
    storageKey?: string | null
}

export function useColorMode<T extends string = BasicColorMode>(options: UseColorModeOptions<T> = {},) {
    const {
        initialValue = 'auto',
        storageKey = 'nativevueuse-color-scheme'
    } = options

    const storage = useStorage();

    const themes = ["auto", "light", "dark", ...options.modes ?? []];

    const system = ref(getSystemTheme());
    const store = ref(storage.getString(storageKey!, initialValue.toString())) as Ref<T | BasicColorSchema>;
    const state = computed<T | BasicColorMode>(() =>
        store.value === 'auto'
            ? system.value
            : store.value,
    )


    Application.on('displayed', processTheme)
    Application.on('systemAppearanceChanged', processTheme)

    onUnmounted(() => {
        Application.off('displayed', processTheme)
        Application.off('systemAppearanceChanged', processTheme)
    })

    function processTheme() {
        if (store.value === "auto") {
            applyTheme(system.value);
        } else {
            applyTheme(store.value);
        }
    }
    function applyTheme(theme: T | BasicColorSchema) {
        if (Application.getRootView()) {
            const rootView = Application.getRootView();
            const rootViewClass = new Set();
            (rootView.className ?? " ").split(/\s+/).forEach((v) => v && rootViewClass.add(v));

            themes.forEach(theme => {
                rootViewClass.delete(getClassFromTheme(theme));
                removeClass(getClassFromTheme(theme))
            })

            if (theme.toLocaleLowerCase().trim() === "auto") {
                setAutoSystemAppearanceChanged(true);
                systemAppearanceChanged(rootView, getSystemTheme()!);
            } else {
                setAutoSystemAppearanceChanged(false);
                rootViewClass.add(getClassFromTheme(theme));
                rootView.className = Array.from(rootViewClass).join(' ');
            }
            storage.setString(storageKey!, theme)
            console.log("Apply: " + Application.getRootView().className);

            if (options.onChanged) {
                options.onChanged(state.value);
            }
        }
    }

    watch(store, () => {
        applyTheme(store.value)
    })

    processTheme();

    return {
        system,
        store,
        themes
    }
}

const getClassFromTheme = (theme: string) => "ns-" + theme.toLocaleLowerCase().trim()
function getSystemTheme(): BasicColorMode {
    if (isAndroid) {
        const nightModeFlags = Utils.android.getApplicationContext().getResources().getConfiguration().uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK;
        switch (nightModeFlags) {
            case android.content.res.Configuration.UI_MODE_NIGHT_YES:
                return "dark"
            case android.content.res.Configuration.UI_MODE_NIGHT_NO:
                return "light"
            default:
                return "light"
            //case android.content.res.Configuration.UI_MODE_NIGHT_UNDEFINED:

        }
    } else {
        return UITraitCollection.currentTraitCollection.userInterfaceStyle === UIUserInterfaceStyle.Light ? "light" : "dark";
    }
}