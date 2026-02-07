import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistrosEmpresaComponent } from './registros-empresa';

describe('RegitrosEmpresa', () => {
  let component: RegistrosEmpresaComponent;
  let fixture: ComponentFixture<RegistrosEmpresaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistrosEmpresaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegistrosEmpresaComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
