import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SemaforoFiltersComponent } from './semaforo-filters.component';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule } from '@ngx-translate/core';
import { SemaforoPermissionsService } from '../../../../services/semaforo-permissions.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('SemaforoFiltersComponent', () => {
  let component: SemaforoFiltersComponent;
  let fixture: ComponentFixture<SemaforoFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SemaforoFiltersComponent],
      imports: [
        FormsModule,
        MatExpansionModule,
        MatIconModule,
        MatButtonModule,
        NgSelectModule,
        BrowserAnimationsModule,
        TranslateModule.forRoot()
      ],
      providers: [SemaforoPermissionsService]
    }).compileComponents();
    
    fixture = TestBed.createComponent(SemaforoFiltersComponent);
    component = fixture.componentInstance;
    component.filters = {
      codigoEstudiante: '',
      idFacultad: null,
      idProyecto: null,
      anioInsGrado: null,
      perInsGrado: null
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit search event', () => {
    spyOn(component.search, 'emit');
    component.onSearch();
    expect(component.search.emit).toHaveBeenCalled();
  });

  it('should emit clear event', () => {
    spyOn(component.clear, 'emit');
    component.onClear();
    expect(component.clear.emit).toHaveBeenCalled();
  });
});
