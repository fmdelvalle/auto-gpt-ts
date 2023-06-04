import i18n from 'i18next';
import * as fs from 'fs';
import path from 'path';
// Example configuration

async function loadLanguage( language: string ) {
    const translation = await import(path.resolve(__dirname, './locales/'+ language ));
    return {translation: translation.default};
}

export async function getTranslation(language: string) {

    let ret= await i18n
    .init({
        lng: language,
        supportedLngs: ['en', 'es'],
        fallbackLng: 'en',
        
        
        resources: {
            en: await loadLanguage('en'),
            es: await loadLanguage('es'),
        }
    });

    await i18n.changeLanguage(language);
    
    return ret;
}



