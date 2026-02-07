import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistrosMaquilerosComponent } from './registros-maquileros';

describe('RegistrosMaquileros', () => {
  let component: RegistrosMaquilerosComponent;
  let fixture: ComponentFixture<RegistrosMaquilerosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistrosMaquilerosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegistrosMaquilerosComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
