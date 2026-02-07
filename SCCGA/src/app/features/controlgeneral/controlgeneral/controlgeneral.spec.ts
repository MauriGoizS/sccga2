import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ControlgeneralComponent } from './controlgeneral';

describe('Controlgeneral', () => {
  let component: ControlgeneralComponent;
  let fixture: ComponentFixture<ControlgeneralComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlgeneralComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ControlgeneralComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
