import { Component, Input } from '@angular/core';
import { PageInfo } from '../../../core/models/page-info.model';

@Component({
  selector: 'app-page-placeholder',
  standalone: true,
  templateUrl: './page-placeholder.component.html',
  styleUrl: './page-placeholder.component.scss'
})
export class PagePlaceholderComponent {
  @Input({ required: true }) page!: PageInfo;
}
