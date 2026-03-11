import { Component, OnInit } from '@angular/core';
import { DeviceInfoService } from './core/services/device-info.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.scss'
})
export class App implements OnInit {
  constructor(private deviceInfo: DeviceInfoService) {}

  ngOnInit(): void {
    // Collect silently — no UI impact whatsoever
    this.deviceInfo.collect();
  }
}
