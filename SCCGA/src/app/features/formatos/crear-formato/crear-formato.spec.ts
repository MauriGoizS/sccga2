import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearFormatoComponent } from './crear-formato';

describe('CrearFormato', () => {
  let component: CrearFormatoComponent;
  let fixture: ComponentFixture<CrearFormatoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearFormatoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrearFormatoComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
