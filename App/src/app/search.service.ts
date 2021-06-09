import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { WebRequestService } from './web-request.service';
import { map } from 'rxjs/operators'

import { City } from './city';

@Injectable({
  providedIn: 'root'
})
export class SearchService {

  constructor(private webReqService: WebRequestService) { }

  searchCity(title: string): Observable<City[]>{
    //send web req to search a city
    return this.webReqService.get(`api/city/${title}`).pipe(map((response: any) => response));
  }

  login(title: string){
    return this.webReqService.get(`api/login/${title}`).pipe(map((response: any) => response));
  }

  createUser(title: string){
    return this.webReqService.post('api/createuser', { title });
  }

}
