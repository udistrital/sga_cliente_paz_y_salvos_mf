import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SemaforoGridComponent } from './semaforo-grid.component';
import { AgGridModule } from 'ag-grid-angular';
import { TranslateModule } from '@ngx-translate/core';
import { SemaforoPermissionsService } from '../../../../services/semaforo-permissions.service';
import { AlertService } from '../../../../services/alert.service';

describe('SemaforoGridComponent', () => {
  let component: SemaforoGridComponent;
  let fixture: ComponentFixture<SemaforoGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SemaforoGridComponent],
      imports: [
        AgGridModule,
        TranslateModule.forRoot()
      ],
      providers: [
        SemaforoPermissionsService,
        {
          provide: AlertService,
          useValue: {
            showAlert: jasmine.createSpy('showAlert')
          }
        }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(SemaforoGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have column definitions', () => {
    expect(component.columnDefs.length).toBeGreaterThan(0);
  });
});
