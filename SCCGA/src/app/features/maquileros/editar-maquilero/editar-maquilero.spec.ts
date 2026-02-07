import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditarMaquileroComponent } from './editar-maquilero';

describe('EditarMaquilero', () => {
  let component: EditarMaquileroComponent;
  let fixture: ComponentFixture<EditarMaquileroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarMaquileroComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarMaquileroComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
