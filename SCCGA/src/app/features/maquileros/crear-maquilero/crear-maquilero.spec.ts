import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrearMaquileroComponent } from './crear-maquilero';

describe('CrearMaquilero', () => {
  let component: CrearMaquileroComponent;
  let fixture: ComponentFixture<CrearMaquileroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearMaquileroComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrearMaquileroComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

