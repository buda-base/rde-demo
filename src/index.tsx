import React, { FC, useEffect } from "react"
import { createRoot } from 'react-dom/client'
import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import { RecoilRoot, useRecoilState } from "recoil"
import { BrowserRouter, Route, Routes, useLocation, useParams, Link } from "react-router-dom"
import { demoConfig } from "./demo_rde_config"
import {
  EntityEditContainer,
  EntityEditContainerMayUpdate,
  NewEntityContainer,
  EntityCreationContainer,
  EntityCreationContainerRoute,
  EntityShapeChooserContainer,
  IdTypeParams,
  EntitySelectorContainer,
  BottomBarContainer,
  enTranslations,
  rdf,
  history,
  atoms,
  getHistoryStatus,
  HistoryStatus
} from "rdf-document-editor"
//} from "../index" 

import "rdf-document-editor/dist/index.css"
import debugFactory from "debug"

const debug = debugFactory("rde:demo")

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
    },
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
      format: function (value: string, format?: string, lng?: any) {
        if (format === "lowercase") return value.toLowerCase()
        else if (format === "uppercase") return value.toUpperCase()
        return value
      },
    },
  })

const HomeContainer: FC = () => {
  return (
    <div className="home">
      <div>
        <Link to="/new/bds:PersonShape">
          New entity    
        </Link>
        <br/>
        <br/>
        <Link to="/edit/bdr:P1583/bds:PersonShape">
          Load demo record    
        </Link>
      </div>
    </div>
  )
}

function AppComponent() {
  
  return (
      <>
        <EntitySelectorContainer config={demoConfig} />
        <Routes>
              <Route path="/" element={<HomeContainer />} />
              <Route path="/new" element={<HomeContainer />} />
              <Route path="/new/:shapeQname" element={<EntityCreationContainer config={demoConfig} />} />
              <Route // we need that route to link back value to property where entity was created
                path="/new/:shapeQname/:subjectQname/:propertyQname/:index"
                element={<EntityCreationContainerRoute config={demoConfig} />}
              />
              <Route // this one as well
                path="/new/:shapeQname/:subjectQname/:propertyQname/:index/:subnodeQname"
                element={<EntityCreationContainerRoute config={demoConfig} />}
                />
              <Route // same with entityQname
                path="/new/:shapeQname/:subjectQname/:propertyQname/:index/named/:entityQname"
                element={<EntityCreationContainerRoute config={demoConfig} />}
                />
              <Route // same with entityQname
                path="/new/:shapeQname/:subjectQname/:propertyQname/:index/:subnodeQname/named/:entityQname"
                element={<EntityCreationContainerRoute config={demoConfig} />}
                />
              <Route
                path="/edit/:entityQname/:shapeQname/:subjectQname/:propertyQname/:index"
                element={<EntityEditContainerMayUpdate config={demoConfig} />}
                />
              <Route
                path="/edit/:entityQname/:shapeQname/:subjectQname/:propertyQname/:index/:subnodeQname"
                element={<EntityEditContainerMayUpdate config={demoConfig} />}
                />
              <Route path="/edit/:entityQname/:shapeQname" element={<EntityEditContainer config={demoConfig} />} />
              <Route path="/edit/:entityQname" element={<EntityShapeChooserContainer config={demoConfig} />} />
        </Routes>
        <BottomBarContainer config={demoConfig}/>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <RecoilRoot>
        <AppComponent />
      </RecoilRoot>
  </BrowserRouter>

  )
}

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(<App />);
