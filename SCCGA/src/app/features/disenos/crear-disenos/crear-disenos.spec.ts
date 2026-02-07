import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearDisenosComponent } from './crear-disenos';

describe('CrearDisenos', () => {
  let component: CrearDisenosComponent;
  let fixture: ComponentFixture<CrearDisenosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearDisenosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrearDisenosComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
