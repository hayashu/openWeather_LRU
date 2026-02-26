export interface CityEntry {
    id: number;
    name: string;
    state: string;
    country: string;
    coord: { lon: number; lat: number };
}

export interface ForecastResponse{
    cod: string;
    message: number;
    cnt: number;
    list: ForecastItem[];
    city: City;
}

export interface ForecastItem{
    dt: number;
    main: MainObject;
    weather: WeatherObject[];
    clouds: { all: number };
    wind: WindObject;
    visibility: number;
    pop: number;
    rain?: {"3h": number};
    snow?: {"3h": number};
    sys: {pod: string};
    dt_txt: string;
}

export interface City{
    id: number;
    name: string;
    coord: {
        "lat": number;
        "lon": number;
    }
    country: string;
    population: number;
    timezone: number;
    sunrise: number;
    sunset: number;
}

export interface MainObject{
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    sea_level?: number;
    grnd_level?: number;
    humidity: number;
    temp_kf?: number;
}

export interface WeatherObject{
    id: number;
    main: string;
    description: string;
    icon: string;
}

export interface WindObject{
    speed: number;
    deg: number;
    gust: number;
}