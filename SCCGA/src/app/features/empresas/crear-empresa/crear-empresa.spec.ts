import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearEmpresaComponent } from './crear-empresa';

describe('CrearEmpresa', () => {
  let component: CrearEmpresaComponent;
  let fixture: ComponentFixture<CrearEmpresaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearEmpresaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrearEmpresaComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
