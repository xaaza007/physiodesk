package jw.PhysioDesk02;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DatabaseLoader implements CommandLineRunner {

    private final PatientRepository repository;

    @Autowired
    public DatabaseLoader(PatientRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... strings) throws Exception {
        this.repository.save(new Patient("Frodo", "Baggins", "ring bearer"));
        this.repository.save(new Patient("Bilbo", "Baggins", "burglar"));
        this.repository.save(new Patient("Gandalf", "the Grey", "wizard"));
        this.repository.save(new Patient("Samwise", "Gamgee", "gardener"));
        this.repository.save(new Patient("Meriadoc", "Brandybuck", "pony rider"));
        this.repository.save(new Patient("Peregrin", "Took", "pipe smoker"));


    }
}
