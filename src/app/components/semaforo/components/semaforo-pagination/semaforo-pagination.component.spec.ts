import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SemaforoPaginationComponent } from './semaforo-pagination.component';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';

describe('SemaforoPaginationComponent', () => {
  let component: SemaforoPaginationComponent;
  let fixture: ComponentFixture<SemaforoPaginationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SemaforoPaginationComponent],
      imports: [
        FormsModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        TranslateModule.forRoot()
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(SemaforoPaginationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate total pages correctly', () => {
    component.totalRecords = 100;
    component.pageSize = 20;
    expect(component.totalPages).toBe(5);
  });

  it('should disable next when on last page', () => {
    component.currentPage = 4;
    component.totalRecords = 100;
    component.pageSize = 20;
    expect(component.canGoNext).toBe(false);
  });

  it('should disable previous when on first page', () => {
    component.currentPage = 0;
    expect(component.canGoPrevious).toBe(false);
  });
});
