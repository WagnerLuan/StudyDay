import * as React from 'react';
import { 
    HomeIcon, BookIcon, RestartIcon, BarChartIcon, ClipboardListIcon, FileTextIcon, 
    CalendarCheckIcon, HistoryIcon, SimuladosIcon, HeartIcon, DatabaseIcon, LogOutIcon,
    CalendarIcon, SettingsIcon
} from '../constants';

// Adicionando ícone de caderno localmente
const NotebookIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path><path d="M12 6v10"></path><path d="M8 10h8"></path></svg>
);

// Ícone de Flashcards (Cartões)
const LayersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
);

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  isOpen: boolean;
  disabled?: boolean; // Adicionada a propriedade disabled
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active = false, onClick, isOpen, disabled = false }) => (
  <li className="list-none">
    <a
      href="#"
      onClick={(e) => {
          e.preventDefault();
          if (!disabled) { // Só chama onClick se não estiver desabilitado
              onClick();
          }
      }}
      className={`
        flex items-center p-3 rounded-lg transition-colors duration-200 
        ${disabled 
            ? 'text-gray-500 cursor-not-allowed opacity-50' 
            : `text-gray-300 hover:bg-gray-700 hover:text-white ${active ? 'bg-emerald-500 text-white font-semibold' : ''}`
        }
      `}
    >
      <div className="w-6 h-6 flex-shrink-0 lg:w-full lg:flex lg:justify-center lg:group-hover:w-6 transition-all duration-300 ease-in-out">
        {icon}
      </div>
      <span className={`
          ml-4 whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out
          lg:w-0 lg:opacity-0 lg:group-hover:w-48 lg:group-hover:opacity-100
          ${isOpen ? 'w-48 opacity-100' : 'w-0 opacity-0'}
      `}>
          {label}
      </span>
    </a>
  </li>
);

const StudyDayLogo = ({ isOpen }: { isOpen: boolean }) => (
    <div className="flex items-center h-20 px-4 border-b border-gray-700">
        <div className="w-9 h-9 flex-shrink-0 lg:w-full lg:flex lg:justify-center lg:group-hover:w-9 transition-all duration-300 ease-in-out">
            <svg width="36" height="36" viewBox="0 0 50 50" className="flex-shrink-0">
                <circle cx="25" cy="25" r="20" stroke="#34D399" strokeWidth="5" fill="none" />
                <circle cx="25" cy="10" r="6" fill="#34D399" />
            </svg>
        </div>
        <span className={`
            text-2xl font-bold text-white whitespace-nowrap ml-2 overflow-hidden transition-all duration-300 ease-in-out
            lg:w-0 lg:opacity-0 lg:group-hover:w-40 lg:group-hover:opacity-100
            ${isOpen ? 'w-40 opacity-100' : 'w-0 opacity-0'}
        `}>
            StudyDay
        </span>
    </div>
);


interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  onOpenTimer: () => void;
  onLogout: () => void; // Nova prop para a função de logout
}


const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, currentPage, setCurrentPage, onOpenTimer, onLogout }) => {
  const navItems = [
    { id: 'home', icon: <HomeIcon />, label: 'Home' },
    { id: 'plans', icon: <ClipboardListIcon />, label: 'Planos' },
    { id: 'materias', icon: <BookIcon />, label: 'Matérias' },
    { id: 'edital', icon: <FileTextIcon />, label: 'Edital' },
    { id: 'planejamento', icon: <CalendarCheckIcon />, label: 'Planejamento' },
    { id: 'blocos', icon: <CalendarIcon className="w-6 h-6" />, label: 'Blocos Semanais' },
    { id: 'caderno', icon: <NotebookIcon />, label: 'Meu Caderno' },
    { id: 'flashcards', icon: <LayersIcon />, label: 'Flashcards' }, // NOVO ITEM
    { id: 'historico', icon: <HistoryIcon />, label: 'Histórico' },
    { id: 'revisoes', icon: <RestartIcon className="w-6 h-6" />, label: 'Revisões' },
    { id: 'estatisticas', icon: <BarChartIcon />, label: 'Estatísticas' },
    { id: 'simulados', icon: <SimuladosIcon />, label: 'Simulados' },
    { id: 'apoie', icon: <HeartIcon />, label: 'Apoie o Projeto', disabled: true },
    { id: 'backup', icon: <DatabaseIcon />, label: 'Backup', disabled: true },
    { id: 'configuracoes', icon: <SettingsIcon className="w-6 h-6" />, label: 'Configurações' },
    { id: 'sair', icon: <LogOutIcon />, label: 'Sair' },
  ];
  
  const handleItemClick = (id: string) => {
    if (id === 'sair') {
      onLogout(); // Chama a função de logout
    } else {
      setCurrentPage(id);
    }

    if (window.innerWidth < 1024) { // Close sidebar on mobile after navigation
        setIsOpen(false);
    }
  }

  return (
    <>
      <aside 
        className={`fixed lg:static top-0 left-0 z-50 h-screen bg-gray-800 shadow-lg transform transition-all duration-300 ease-in-out group
                   w-64 flex-shrink-0 
                   lg:w-20 lg:hover:w-64
                   ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          <StudyDayLogo isOpen={isOpen} />
          <nav className="flex-1 px-2 py-4 overflow-y-auto">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <NavItem 
                  key={item.id} 
                  icon={item.icon} 
                  label={item.label} 
                  active={currentPage === item.id}
                  onClick={() => handleItemClick(item.id)}
                  isOpen={isOpen}
                  disabled={item.disabled} // Passa a propriedade disabled
               />
              ))}
            </ul>
          </nav>
        </div>
      </aside>
      {isOpen && <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black opacity-50 z-30 lg:hidden"></div>}
    </>
  );
};

export default Sidebar;