import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { fromEvent } from 'rxjs';

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
    let lang = getCookie('lang') ?? 'es';
    this.whatLang$.subscribe((x: any) => {
      lang = x['detail']['answer'];
      this.translate.use(lang);
    });
    this.translate.use(lang);
  }
}
