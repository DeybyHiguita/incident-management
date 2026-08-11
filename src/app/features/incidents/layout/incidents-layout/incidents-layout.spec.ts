import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncidentsLayout } from './incidents-layout';

describe('IncidentsLayout', () => {
  let component: IncidentsLayout;
  let fixture: ComponentFixture<IncidentsLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentsLayout]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IncidentsLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
