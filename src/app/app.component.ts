import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { fromEvent } from 'rxjs';
import es from '../assets/i18n/es.json';
import en from '../assets/i18n/en.json';

// Función para obtener cookies
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

@Component({
  selector: 'paz-y-salvos-mf',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass']
})
export class AppComponent implements OnInit {
  title = 'paz-y-salvos-mf';
  whatLang$ = fromEvent(window, 'lang');

  constructor(private readonly translate: TranslateService) {}

  ngOnInit() {
    this.validateLang();
  }

  validateLang() {
    // El catálogo debe corresponder al mismo build del MF, aunque el host de
    // assets todavía sirva un JSON de una versión anterior.
    this.translate.setTranslation('es', es, true);
    this.translate.setTranslation('en', en, true);
    this.translate.setDefaultLang('es');
    let lang = this.normalizarIdioma(getCookie('lang'));
    this.whatLang$.subscribe((x: any) => {
      lang = this.normalizarIdioma(x?.detail?.answer);
      this.usarIdioma(lang);
    });
    this.usarIdioma(lang);
  }

  private normalizarIdioma(lang: unknown): 'es' | 'en' {
    return typeof lang === 'string' && lang.toLowerCase().startsWith('en') ? 'en' : 'es';
  }

  private usarIdioma(lang: 'es' | 'en'): void {
    this.translate.use(lang).subscribe({
      error: () => {
        if (lang !== 'es') this.translate.use('es').subscribe();
      }
    });
  }
}
